import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId
  const body = await request.json().catch(() => ({}))
  if (!body.project_id || !body.step_id || !body.type || !body.title) {
    return NextResponse.json({ ok: false, error: 'project_id, step_id, type, title required' }, { status: 400 })
  }
  const VALID_TYPES = ['uat', 'change_request', 'deviation', 'other']
  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data: inserted, error } = await supabase.from('decision_points').insert({
    project_id: body.project_id,
    step_id: body.step_id,
    type: body.type,
    title: body.title,
    status: 'pending',
  }).select('id').single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: { decision_id: (inserted as any).id } })
}
