import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    step_id?: string
    include_hidden?: boolean
  }

  if (!body.step_id) {
    return NextResponse.json({ ok: false, error: 'step_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: tasksRaw, error } = await supabase
      .from('tasks')
      .select('id, title, status, kind, est, w_start, w_end, assignee_name, is_milestone, hidden, type, due_date, completion_date')
      .eq('step_id', body.step_id)
      .order('task_order', { ascending: true })

    if (error) {
      console.error('[mcp/get_tasks] tasks fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const tasks = (tasksRaw ?? []).filter((t) => {
      if (!body.include_hidden && t.hidden) return false
      return true
    })

    const data = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      kind: t.kind,
      est: t.est,
      wStart: t.w_start,
      wEnd: t.w_end,
      assigneeName: t.assignee_name,
      isMilestone: t.is_milestone,
      hidden: t.hidden,
      types: t.type ?? [],
      dueDate: t.due_date ?? null,
      completionDate: t.completion_date ?? null,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_tasks] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
