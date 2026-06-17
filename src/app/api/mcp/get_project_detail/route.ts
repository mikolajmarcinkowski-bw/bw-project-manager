import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('api_tokens')
    .select('user_id')
    .eq('token', token)
    .is('revoked_at', null)
    .single()
  return (data as { user_id: string } | null)?.user_id ?? null
}

export async function POST(request: NextRequest) {
  const userId = await verifyToken(request.headers.get('authorization'))
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { project_id?: string }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const projectId = body.project_id

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, name, description, status, start_date, end_date, client_id, clients(id, name)')
      .eq('id', projectId)
      .single()

    if (projErr || !project) {
      console.error('[mcp/get_project_detail] project fetch failed:', projErr)
      if (projErr?.code === 'PGRST116') {
        return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const [
      { data: typesRows, error: typesErr },
      { data: stepsRows, error: stepsErr },
      { data: taskRows, error: tasksErr },
      { data: msRows, error: msErr },
      { data: decRows, error: decErr },
      { data: pmRows, error: pmErr },
    ] = await Promise.all([
      supabase.from('project_types').select('type').eq('project_id', projectId),
      supabase
        .from('project_steps')
        .select('id, phase_number, phase_name, step_title, status, is_active, is_parallel, is_recurring, is_decision, step_order')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: true })
        .order('step_order', { ascending: true }),
      supabase
        .from('tasks')
        .select('id, step_id, title, status, kind, est, w_start, w_end, assignee_name, is_milestone, hidden, type, due_date, completion_date, warning_muted, task_order')
        .eq('project_id', projectId)
        .order('task_order', { ascending: true }),
      supabase.from('milestones').select('id, ms_code, name, week, status').eq('project_id', projectId),
      supabase.from('decision_points').select('id, type, status, title, step_id').eq('project_id', projectId),
      supabase.from('project_pms').select('profiles(id, full_name)').eq('project_id', projectId),
    ])

    if (typesErr) console.error('[mcp/get_project_detail] types:', typesErr)
    if (stepsErr) console.error('[mcp/get_project_detail] steps:', stepsErr)
    if (tasksErr) console.error('[mcp/get_project_detail] tasks:', tasksErr)
    if (msErr) console.error('[mcp/get_project_detail] milestones:', msErr)
    if (decErr) console.error('[mcp/get_project_detail] decisions:', decErr)
    if (pmErr) console.error('[mcp/get_project_detail] pms:', pmErr)

    // Group tasks by step
    const tasksByStep = new Map<string, object[]>()
    for (const t of taskRows ?? []) {
      const arr = tasksByStep.get(t.step_id) ?? []
      arr.push({
        id: t.id,
        title: t.title,
        status: t.status,
        kind: t.kind,
        est: t.est,
        wStart: t.w_start,
        wEnd: t.w_end,
        assigneeName: t.assignee_name,
        isMilestone: t.is_milestone,
        hidden: t.hidden ?? false,
        types: (t.type ?? []),
        dueDate: t.due_date ?? null,
        completionDate: t.completion_date ?? null,
        warningMuted: t.warning_muted ?? false,
      })
      tasksByStep.set(t.step_id, arr)
    }

    const steps = (stepsRows ?? []).map((s) => {
      const tasks = tasksByStep.get(s.id) ?? []
      return {
        id: s.id,
        phaseNumber: s.phase_number,
        phaseName: s.phase_name,
        stepTitle: s.step_title,
        status: s.status,
        isActive: s.is_active,
        isParallel: s.is_parallel,
        isRecurring: s.is_recurring,
        isDecision: s.is_decision,
        tasks,
      }
    })

    const milestones = (msRows ?? []).map((m) => ({
      id: m.id,
      msCode: m.ms_code,
      name: m.name,
      week: m.week,
      status: m.status,
    }))

    const today = new Date().toISOString().slice(0, 10)
    const { data: riskTasks } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('project_id', projectId)
      .lt('due_date', today)
      .not('status', 'in', '(done,na)')
    const { data: riskProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('status', 'active')
      .lt('end_date', today)
    const atRisk = (riskTasks?.length ?? 0) > 0 || (riskProject?.length ?? 0) > 0

    const clientField = Array.isArray(project.clients) ? project.clients[0] : project.clients

    const pms = (pmRows ?? [])
      .map((r) => {
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
        return prof ? { id: prof.id, fullName: prof.full_name } : null
      })
      .filter((x): x is { id: string; fullName: string | null } => x != null)

    const data = {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      status: project.status,
      startDate: project.start_date ?? null,
      endDate: project.end_date ?? null,
      types: (typesRows ?? []).map((r) => r.type),
      client: { id: clientField?.id ?? '', name: clientField?.name ?? '' },
      pms,
      atRisk,
      steps,
      milestones,
      decisions: (decRows ?? []).map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        title: d.title,
        stepId: d.step_id,
      })),
    }

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_project_detail] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
