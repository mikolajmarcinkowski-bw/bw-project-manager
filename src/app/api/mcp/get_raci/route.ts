import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.project_id) return NextResponse.json({ ok: false, error: 'project_id required' }, { status: 400 })
  const supabase = createAdminClient()
  // !inner eliminuje wiersze task_role_assignments bez pasującego tasks.project_id
  const { data, error } = await (supabase
    .from('task_role_assignments' as any)
    .select('task_id, role, raci, tasks!inner(id, title, step_id, project_id)') as any)
    .eq('tasks.project_id', body.project_id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}
