import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = ['yes', 'no', 'pending'] as const
type DecisionStatus = (typeof VALID_STATUSES)[number]

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('api_tokens')
    .select('user_id')
    .eq('token', token)
    .is('revoked_at', null)
    .single()
  return data?.user_id ?? null
}

export async function POST(request: NextRequest) {
  const userId = await verifyToken(request.headers.get('authorization'))
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { decision_id, status, notes } = body as Record<string, unknown>

  if (!decision_id || typeof decision_id !== 'string') {
    return NextResponse.json({ error: 'decision_id jest wymagany.' }, { status: 400 })
  }
  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status jest wymagany.' }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status as DecisionStatus)) {
    return NextResponse.json(
      { error: `Nieprawidlowy status: ${status}. Dozwolone: ${VALID_STATUSES.join(', ')}.` },
      { status: 400 }
    )
  }
  if (notes !== undefined && typeof notes !== 'string') {
    return NextResponse.json({ error: 'notes musi byc stringiem.' }, { status: 400 })
  }

  const newStatus = status as DecisionStatus
  const supabase = createAdminClient()

  try {
    // Pobierz stan przed zmiana
    const { data: before, error: fetchErr } = await supabase
      .from('decision_points')
      .select('id, status, project_id')
      .eq('id', decision_id)
      .single()

    if (fetchErr || !before) {
      return NextResponse.json({ error: 'Nie znaleziono decyzji.' }, { status: 404 })
    }

    const beforeTyped = before as {
      id: string
      status: string
      project_id: string
    }

    const { error: updErr } = await supabase
      .from('decision_points')
      .update({
        status: newStatus,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        notes: typeof notes === 'string' ? notes : null,
      })
      .eq('id', decision_id)

    if (updErr) {
      console.error('[update_decision] update failed:', updErr)
      return NextResponse.json({ error: 'Nie udalo sie zapisac decyzji.' }, { status: 500 })
    }

    // Activity log (nieblokujace)
    const { error: logErr } = await supabase.from('activity_log').insert({
      entity: 'decision',
      entity_id: decision_id,
      action: 'update_decision',
      actor_id: userId,
      before: { status: beforeTyped.status },
      after: { status: newStatus, notes: typeof notes === 'string' ? notes : null },
    })
    if (logErr) console.error('[update_decision] activity_log failed:', logErr)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update_decision] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
