import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as { project_id?: string }

  if (!body.project_id || typeof body.project_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('project_id', body.project_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[mcp/get_stakeholders]:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (err) {
    console.error('[mcp/get_stakeholders] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
