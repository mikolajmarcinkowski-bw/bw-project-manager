import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  // No required parameters — guard against empty/missing body
  await request.json().catch(() => ({}))

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (error) {
      console.error('[mcp/get_team_members] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const members = (data ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      role: p.role,
    }))

    return NextResponse.json({ ok: true, data: members })
  } catch (err) {
    console.error('[mcp/get_team_members] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
