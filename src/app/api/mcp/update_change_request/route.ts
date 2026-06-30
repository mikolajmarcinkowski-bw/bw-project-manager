import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_CR_STATUS = ['draft', 'pending', 'approved', 'rejected', 'implemented'] as const
const VALID_APPROVAL = ['pending', 'approved', 'rejected'] as const

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

  const { cr_id, status, notes, bw_approval } = body

  if (typeof cr_id !== 'string' || !cr_id.trim()) {
    return NextResponse.json({ ok: false, error: 'cr_id jest wymagany.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!VALID_CR_STATUS.includes(status as (typeof VALID_CR_STATUS)[number])) {
      return NextResponse.json({
        ok: false,
        error: `status musi byc jednym z: ${VALID_CR_STATUS.join(', ')}.`,
      }, { status: 400 })
    }
    updates.status = status
  }
  if (notes !== undefined) {
    updates.notes = typeof notes === 'string' ? notes.trim() || null : null
  }
  if (bw_approval !== undefined) {
    if (!VALID_APPROVAL.includes(bw_approval as (typeof VALID_APPROVAL)[number])) {
      return NextResponse.json({
        ok: false,
        error: `bw_approval musi byc jednym z: ${VALID_APPROVAL.join(', ')}.`,
      }, { status: 400 })
    }
    updates.bw_approval = bw_approval
    if (bw_approval === 'approved' || bw_approval === 'rejected') {
      updates.bw_approver = user.userId
      updates.bw_approval_date = new Date().toISOString().slice(0, 10)
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: change_requests not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('change_requests')
    .update(updates)
    .eq('id', cr_id)
    .select('id, project_id')
    .single()

  if (error) {
    console.error('[mcp/update_change_request] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const row = data as { id: string; project_id: string }

  try {
    await supabase.from('activity_log').insert({
      entity: 'change_request',
      entity_id: row.id,
      action: 'update_change_request',
      actor_id: user.userId,
      before: null,
      after: updates,
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id, updated: Object.keys(updates) } })
}
