import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  // Body is optional
  const body = await request.json().catch(() => ({})) as {
    type?: string
    phase?: number
  }

  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('step_templates')
      .select('id, phase_number, phase_name, step_title, kind, is_decision, is_parallel, is_recurring, step_order')
      .eq('is_recurring', false)
      .order('phase_number', { ascending: true })
      .order('step_order', { ascending: true })

    if (body.phase !== undefined) {
      query = query.eq('phase_number', body.phase)
    }

    const { data: templates, error: templatesError } = await query

    if (templatesError) {
      console.error('[mcp/get_step_templates] templates fetch failed:', templatesError)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const templateIds = (templates ?? []).map((t) => t.id)

    let taskTemplates: Array<{
      id: string
      step_template_id: string
      task_title: string
      kind: string
      applies_to_types: string[]
      w_start: number | null
      w_end: number | null
      est: number | null
      is_milestone: boolean
    }> = []

    if (templateIds.length > 0) {
      const { data: taskData, error: taskError } = await supabase
        .from('step_task_templates')
        .select('id, step_template_id, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone')
        .in('step_template_id', templateIds)
        .order('task_order', { ascending: true })

      if (taskError) {
        console.error('[mcp/get_step_templates] task templates fetch failed:', taskError)
      }

      taskTemplates = (taskData ?? []).map((t) => ({
        id: t.id,
        step_template_id: t.step_template_id,
        task_title: t.task_title,
        kind: t.kind,
        applies_to_types: (t.applies_to_types ?? []) as string[],
        w_start: t.w_start,
        w_end: t.w_end,
        est: t.est,
        is_milestone: t.is_milestone,
      }))
    }

    // Group task templates by step_template_id
    const tasksByTemplate = new Map<string, typeof taskTemplates>()
    for (const t of taskTemplates) {
      const arr = tasksByTemplate.get(t.step_template_id) ?? []
      arr.push(t)
      tasksByTemplate.set(t.step_template_id, arr)
    }

    // Apply optional type filter (filter templates whose tasks apply to the given type)
    let filteredTemplates = templates ?? []
    if (body.type) {
      filteredTemplates = filteredTemplates.filter((tmpl) => {
        const tasks = tasksByTemplate.get(tmpl.id) ?? []
        // Keep template if any task applies to the requested type (or has empty applies_to_types = all types)
        return tasks.some(
          (t) => t.applies_to_types.length === 0 || t.applies_to_types.includes(body.type!)
        )
      })
    }

    const data = filteredTemplates.map((tmpl) => ({
      id: tmpl.id,
      phaseNumber: tmpl.phase_number,
      phaseName: tmpl.phase_name,
      stepTitle: tmpl.step_title,
      kind: tmpl.kind,
      isDecision: tmpl.is_decision,
      isParallel: tmpl.is_parallel,
      isRecurring: tmpl.is_recurring,
      stepOrder: tmpl.step_order,
      tasks: (tasksByTemplate.get(tmpl.id) ?? []).map((t) => ({
        id: t.id,
        taskTitle: t.task_title,
        kind: t.kind,
        appliesToTypes: t.applies_to_types,
        wStart: t.w_start,
        wEnd: t.w_end,
        est: t.est,
        isMilestone: t.is_milestone,
      })),
    }))

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_step_templates] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
