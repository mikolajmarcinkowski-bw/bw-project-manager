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

    const [settingsResult, linesResult] = await Promise.all([
      supabase
        .from('budget_settings')
        .select('*')
        .eq('project_id', body.project_id)
        .single(),
      supabase
        .from('budget_lines')
        .select('*')
        .eq('project_id', body.project_id)
        .order('created_at', { ascending: true }),
    ])

    // PGRST116 = no rows (settings not configured yet) — that's fine
    if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
      console.error('[mcp/get_budget] settings:', settingsResult.error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }
    if (linesResult.error) {
      console.error('[mcp/get_budget] lines:', linesResult.error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const lines = linesResult.data ?? []
    const totalEstH    = lines.reduce((sum, l) => sum + ((l as Record<string, unknown>).est_h    as number ?? 0), 0)
    const totalActualH = lines.reduce((sum, l) => sum + ((l as Record<string, unknown>).actual_h as number ?? 0), 0)
    const burnRatePct  = totalEstH > 0 ? Math.round(totalActualH / totalEstH * 100) : null

    return NextResponse.json({
      ok: true,
      data: {
        settings: settingsResult.data ?? null,
        lines,
        totalEstH,
        totalActualH,
        burnRatePct,
      },
    })
  } catch (err) {
    console.error('[mcp/get_budget] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
