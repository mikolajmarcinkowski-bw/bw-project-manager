import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { project_id?: string }
  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('project_types')
      .select('type')
      .eq('project_id', body.project_id)

    if (error) {
      console.error('[mcp/get_project_types] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: { types: (data ?? []).map(r => r.type) } })
  } catch (err) {
    console.error('[mcp/get_project_types] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
