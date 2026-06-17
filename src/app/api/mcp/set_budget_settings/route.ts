import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { project_id, rate_k, rate_w, rate_d, buffer_pct, pm_overhead_pct, budget_max } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof rate_k !== 'number' || rate_k < 0) {
    return NextResponse.json({ ok: false, error: 'rate_k musi byc liczba >= 0.' }, { status: 400 })
  }
  if (typeof rate_w !== 'number' || rate_w < 0) {
    return NextResponse.json({ ok: false, error: 'rate_w musi byc liczba >= 0.' }, { status: 400 })
  }
  if (typeof rate_d !== 'number' || rate_d < 0) {
    return NextResponse.json({ ok: false, error: 'rate_d musi byc liczba >= 0.' }, { status: 400 })
  }
  if (buffer_pct !== undefined && (typeof buffer_pct !== 'number' || buffer_pct < 0)) {
    return NextResponse.json({ ok: false, error: 'buffer_pct musi byc liczba >= 0.' }, { status: 400 })
  }
  if (pm_overhead_pct !== undefined && (typeof pm_overhead_pct !== 'number' || pm_overhead_pct < 0)) {
    return NextResponse.json({ ok: false, error: 'pm_overhead_pct musi byc liczba >= 0.' }, { status: 400 })
  }
  if (budget_max !== undefined && (typeof budget_max !== 'number' || budget_max < 0)) {
    return NextResponse.json({ ok: false, error: 'budget_max musi byc liczba >= 0.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // UPSERT — budget_settings.project_id is PK
  // TODO: budget_settings not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('budget_settings')
    .upsert(
      {
        project_id,
        rate_k,
        rate_w,
        rate_d,
        buffer_pct: typeof buffer_pct === 'number' ? buffer_pct : 0,
        pm_overhead_pct: typeof pm_overhead_pct === 'number' ? pm_overhead_pct : 0,
        budget_max: typeof budget_max === 'number' ? budget_max : null,
      },
      { onConflict: 'project_id' }
    )
    .select('project_id')
    .single()

  if (error) {
    console.error('[mcp/set_budget_settings] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'set_budget_settings',
      actor_id: user.userId,
      before: null,
      after: { rate_k, rate_w, rate_d, buffer_pct, pm_overhead_pct, budget_max },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { project_id: (data as { project_id: string }).project_id } })
}
