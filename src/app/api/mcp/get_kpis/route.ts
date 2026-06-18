import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as { project_id?: string }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // kpis not in generated types yet — cast to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawKpis, error } = await (supabase as any)
      .from('kpis')
      .select('id, name, target, actual_value, status, notes, created_at')
      .eq('project_id', body.project_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[mcp/get_kpis] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const data = (rawKpis ?? []).map((k: Record<string, unknown>) => ({
      id: k.id,
      name: k.name,
      target: k.target ?? null,
      actualValue: k.actual_value ?? null,
      status: k.status,
      notes: k.notes ?? null,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_kpis] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
