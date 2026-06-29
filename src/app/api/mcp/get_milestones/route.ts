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
      .from('milestones')
      .select('id, ms_code, name, week, target_date, status')
      .eq('project_id', body.project_id)
      .order('week', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[mcp/get_milestones] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const milestones = (data ?? []).map(m => ({
      id: m.id,
      msCode: m.ms_code,
      name: m.name,
      week: m.week ?? null,
      targetDate: (m as Record<string, unknown>).target_date ?? null,
      status: m.status,
    }))

    return NextResponse.json({ ok: true, data: { milestones } })
  } catch (err) {
    console.error('[mcp/get_milestones] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
