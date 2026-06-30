import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    status?: string
    assignee?: string | null  // null = filtruj zadania BEZ assignee
    overdue?: boolean
    include_hidden?: boolean
  }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }

  const VALID_STATUS = ['todo', 'in_progress', 'done', 'for_quality', 'na']
  if (body.status && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({
      ok: false,
      error: `status musi być jednym z: ${VALID_STATUS.join(', ')}.`,
    }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Pobierz kroki projektu żeby mieć stepTitle i phaseNumber
    const { data: steps } = await supabase
      .from('project_steps')
      .select('id, step_title, phase_number, phase_name')
      .eq('project_id', body.project_id)

    const stepMap = new Map((steps ?? []).map(s => [s.id, s]))

    // Buduj zapytanie na tasks
    let query = supabase
      .from('tasks')
      .select('id, step_id, title, status, assignee_name, pm_assignee_id, due_date, completion_date, est, kind, type, is_milestone, hidden, warning_muted, w_start, w_end, task_order')
      .eq('project_id', body.project_id)
      .order('task_order', { ascending: true })

    if (!body.include_hidden) {
      query = query.eq('hidden', false)
    }

    if (body.status) {
      query = query.eq('status', body.status)
    }

    // assignee filter: null = brak assignee; string = konkretna osoba
    if (body.assignee === null) {
      query = query.is('assignee_name', null)
    } else if (typeof body.assignee === 'string' && body.assignee !== '') {
      query = query.eq('assignee_name', body.assignee)
    }

    if (body.overdue) {
      const today = new Date().toISOString().slice(0, 10)
      query = query
        .lt('due_date', today)
        .not('status', 'in', '(done,na)')
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('[mcp/get_project_tasks] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const data = (tasks ?? []).map(t => {
      const step = stepMap.get(t.step_id)
      return {
        id: t.id,
        stepId: t.step_id,
        stepTitle: step?.step_title ?? null,
        phaseNumber: step?.phase_number ?? null,
        phaseName: step?.phase_name ?? null,
        title: t.title,
        status: t.status,
        assigneeName: t.assignee_name,
        dueDate: t.due_date ?? null,
        completionDate: t.completion_date ?? null,
        est: t.est ?? null,
        kind: t.kind,
        isMilestone: t.is_milestone,
        hidden: t.hidden,
        wStart: t.w_start ?? null,
        wEnd: t.w_end ?? null,
      }
    })

    return NextResponse.json({ ok: true, data: { tasks: data, count: data.length } })
  } catch (err) {
    console.error('[mcp/get_project_tasks] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
