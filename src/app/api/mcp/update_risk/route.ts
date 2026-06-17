import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_RAG = ['R', 'A', 'G'] as const
const VALID_STATUS = ['open', 'monitor', 'closed'] as const

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

  const { risk_id, rag, status, mitigation, owner } = body

  if (typeof risk_id !== 'string' || !risk_id.trim()) {
    return NextResponse.json({ ok: false, error: 'risk_id jest wymagany.' }, { status: 400 })
  }

  // Zbierz tylko podane pola
  const updates: Record<string, unknown> = {}

  if (rag !== undefined) {
    if (!VALID_RAG.includes(rag as (typeof VALID_RAG)[number])) {
      return NextResponse.json({ ok: false, error: "rag musi byc 'R', 'A' lub 'G'." }, { status: 400 })
    }
    updates.rag = rag
  }
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      return NextResponse.json({ ok: false, error: "status musi byc 'open', 'monitor' lub 'closed'." }, { status: 400 })
    }
    updates.status = status
  }
  if (mitigation !== undefined) {
    updates.mitigation = typeof mitigation === 'string' ? mitigation.trim() || null : null
  }
  if (owner !== undefined) {
    if (typeof owner !== 'string' || !owner.trim()) {
      return NextResponse.json({ ok: false, error: 'owner nie moze byc pusty.' }, { status: 400 })
    }
    updates.owner = owner.trim()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: risks not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('risks')
    .update(updates)
    .eq('id', risk_id)
    .select('id, project_id')
    .single()

  if (error) {
    console.error('[mcp/update_risk] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const row = data as { id: string; project_id: string }

  try {
    await supabase.from('activity_log').insert({
      entity: 'risk',
      entity_id: row.id,
      action: 'update_risk',
      actor_id: user.userId,
      before: null,
      after: updates,
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id } })
}
