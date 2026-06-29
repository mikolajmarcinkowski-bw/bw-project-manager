import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

interface StepInput {
  phase_number: number
  phase_name: string
  step_title: string
  kind?: string
  is_recurring?: boolean
  is_parallel?: boolean
  is_decision?: boolean
  tasks?: TaskInput[]
}

interface TaskInput {
  title: string
  kind: string
  type?: string[]
  w_start?: number
  w_end?: number
  est?: number
  is_milestone?: boolean
  assignee_name?: string
  completion_date?: string
}

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    steps?: StepInput[]
  }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    return NextResponse.json({ ok: false, error: 'steps[] wymagany co najmniej jeden element' }, { status: 400 })
  }

  for (const s of body.steps) {
    if (typeof s.phase_number !== 'number' || !s.phase_name || !s.step_title) {
      return NextResponse.json({ ok: false, error: 'Każdy step wymaga: phase_number, phase_name, step_title' }, { status: 400 })
    }
  }

  try {
    const supabase = createAdminClient()

    // Verify project exists
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ ok: false, error: 'Projekt nie znaleziony' }, { status: 404 })
    }

    // Get max step_order per phase to avoid collisions
    const { data: existingSteps } = await supabase
      .from('project_steps')
      .select('phase_number, step_order')
      .eq('project_id', body.project_id)

    const maxOrderByPhase = new Map<number, number>()
    for (const s of existingSteps ?? []) {
      const cur = maxOrderByPhase.get(s.phase_number) ?? 0
      if (s.step_order > cur) maxOrderByPhase.set(s.phase_number, s.step_order)
    }

    let stepsAdded = 0
    let tasksAdded = 0
    const insertedStepIds: string[] = []

    for (const stepInput of body.steps) {
      const nextOrder = (maxOrderByPhase.get(stepInput.phase_number) ?? 0) + 1
      maxOrderByPhase.set(stepInput.phase_number, nextOrder)

      const { data: insertedStep, error: stepErr } = await supabase
        .from('project_steps')
        .insert({
          project_id: body.project_id,
          phase_number: stepInput.phase_number,
          phase_name: stepInput.phase_name,
          step_order: nextOrder,
          step_title: stepInput.step_title,
          kind: stepInput.kind ?? null,
          is_recurring: stepInput.is_recurring ?? false,
          is_parallel: stepInput.is_parallel ?? false,
          is_decision: stepInput.is_decision ?? false,
          status: 'todo',
          is_active: false,
        })
        .select('id')
        .single()

      if (stepErr || !insertedStep) {
        console.error('[mcp/add_steps_to_project] step insert failed:', stepErr)
        return NextResponse.json({ ok: false, error: `Nie udało się dodać kroku "${stepInput.step_title}"` }, { status: 500 })
      }

      const stepId = (insertedStep as { id: string }).id
      insertedStepIds.push(stepId)
      stepsAdded++

      if (Array.isArray(stepInput.tasks) && stepInput.tasks.length > 0) {
        const taskRows = stepInput.tasks.map((t, idx) => ({
          step_id: stepId,
          project_id: body.project_id,
          task_order: idx + 1,
          title: t.title,
          kind: t.kind,
          type: t.type ?? [],
          w_start: t.w_start ?? null,
          w_end: t.w_end ?? null,
          est: t.est ?? null,
          is_milestone: t.is_milestone ?? false,
          status: 'todo' as const,
          hidden: false,
          assignee_name: t.assignee_name ?? null,
          completion_date: t.completion_date ?? null,
        }))

        const { error: tasksErr } = await supabase.from('tasks').insert(taskRows)
        if (tasksErr) {
          console.error('[mcp/add_steps_to_project] tasks insert failed:', tasksErr)
          return NextResponse.json({ ok: false, error: `Nie udało się dodać zadań do kroku "${stepInput.step_title}"` }, { status: 500 })
        }
        tasksAdded += taskRows.length
      }
    }

    try {
      await supabase.from('activity_log' as never).insert({
        entity: 'project',
        entity_id: body.project_id,
        action: 'add_steps_to_project',
        actor_id: userId,
        before: null,
        after: { stepsAdded, tasksAdded, stepIds: insertedStepIds },
      })
    } catch { /* activity log non-critical */ }

    return NextResponse.json({
      ok: true,
      data: {
        stepsAdded,
        tasksAdded,
        stepIds: insertedStepIds,
        projectUrl: `https://bw-project-manager.vercel.app/projects/${body.project_id}`,
      },
    })
  } catch (err) {
    console.error('[mcp/add_steps_to_project] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
