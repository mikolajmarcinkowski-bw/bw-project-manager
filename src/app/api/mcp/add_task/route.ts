import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId
  const body = await request.json().catch(() => ({}))
  if (!body.step_id || !body.title || !body.kind) {
    return NextResponse.json({ ok: false, error: 'step_id, title, kind required' }, { status: 400 })
  }
  const supabase = createAdminClient()
  // Get project_id from step
  const { data: step } = await supabase.from('project_steps').select('project_id, phase_number').eq('id', body.step_id).single()
  if (!step) return NextResponse.json({ ok: false, error: 'Step not found' }, { status: 404 })

  // Get max task_order
  const { data: maxOrder } = await supabase.from('tasks').select('task_order').eq('step_id', body.step_id).order('task_order', { ascending: false }).limit(1).single()

  const { data: inserted, error } = await supabase.from('tasks').insert({
    step_id: body.step_id,
    project_id: step.project_id,
    title: body.title,
    kind: body.kind,
    type: body.type ?? [],
    w_start: body.w_start ?? null,
    w_end: body.w_end ?? null,
    est: body.est ?? null,
    is_milestone: body.is_milestone ?? false,
    status: 'todo',
    hidden: false,
    task_order: ((maxOrder as any)?.task_order ?? 0) + 1,
  }).select('id').single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  try {
    await supabase.from('activity_log' as any).insert({
      entity: 'project', entity_id: step.project_id,
      action: 'add_task', actor_id: userId,
      before: null, after: { task_id: (inserted as any).id, title: body.title },
    })
  } catch (e) {
    // Activity log is non-critical
  }

  return NextResponse.json({ ok: true, data: { task_id: (inserted as any).id } })
}
