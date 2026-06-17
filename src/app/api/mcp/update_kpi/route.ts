import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_STATUS = ['on', 'at', 'off', 'done'] as const

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

  const { kpi_id, actual_value, status, notes } = body

  if (typeof kpi_id !== 'string' || !kpi_id.trim()) {
    return NextResponse.json({ ok: false, error: 'kpi_id jest wymagany.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (actual_value !== undefined) {
    updates.actual_value = typeof actual_value === 'string' ? actual_value.trim() || null : null
  }
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      return NextResponse.json({
        ok: false,
        error: `status musi byc jednym z: ${VALID_STATUS.join(', ')}.`,
      }, { status: 400 })
    }
    updates.status = status
  }
  if (notes !== undefined) {
    updates.notes = typeof notes === 'string' ? notes.trim() || null : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: kpis not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kpis')
    .update(updates)
    .eq('id', kpi_id)
    .select('id, project_id')
    .single()

  if (error) {
    console.error('[mcp/update_kpi] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const row = data as { id: string; project_id: string }

  try {
    await supabase.from('activity_log').insert({
      entity: 'kpi',
      entity_id: row.id,
      action: 'update_kpi',
      actor_id: user.userId,
      before: null,
      after: updates,
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id } })
}
