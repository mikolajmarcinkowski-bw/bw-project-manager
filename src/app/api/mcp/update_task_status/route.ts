import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'for_quality', 'na'] as const
type TaskStatus = (typeof VALID_STATUSES)[number]

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

  const { task_id, status } = body as Record<string, unknown>

  if (!task_id || typeof task_id !== 'string') {
    return NextResponse.json({ error: 'task_id jest wymagany.' }, { status: 400 })
  }
  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status jest wymagany.' }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status as TaskStatus)) {
    return NextResponse.json(
      { error: `Nieprawidlowy status: ${status}. Dozwolone: ${VALID_STATUSES.join(', ')}.` },
      { status: 400 }
    )
  }

  const newStatus = status as TaskStatus
  const supabase = createAdminClient()

  try {
    // Pobierz stan przed zmiana
    const { data: before, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, status, project_id, completion_date')
      .eq('id', task_id)
      .single()

    if (fetchErr || !before) {
      return NextResponse.json({ error: 'Nie znaleziono zadania.' }, { status: 404 })
    }

    const beforeTyped = before as {
      id: string
      status: string
      project_id: string
      completion_date: string | null
    }

    if (beforeTyped.status === newStatus) {
      return NextResponse.json({ ok: true, changed: false })
    }

    // completion_date: ustaw na dzis przy done; wyczysc gdy schodzimy z done
    const today = new Date().toISOString().slice(0, 10)
    let completion_date = beforeTyped.completion_date
    if (newStatus === 'done') completion_date = beforeTyped.completion_date ?? today
    else if (beforeTyped.status === 'done') completion_date = null

    // hidden: na=ukryte, inne=widoczne
    const hidden = newStatus === 'na'

    const { error: updErr } = await supabase
      .from('tasks')
      .update({ status: newStatus, completion_date, hidden })
      .eq('id', task_id)

    if (updErr) {
      console.error('[update_task_status] update failed:', updErr)
      return NextResponse.json({ error: 'Nie udalo sie zapisac statusu.' }, { status: 500 })
    }

    // Activity log (nieblokujace)
    const { error: logErr } = await supabase.from('activity_log').insert({
      entity: 'task',
      entity_id: task_id,
      action: 'update_task_status',
      actor_id: userId,
      before: { status: beforeTyped.status },
      after: { status: newStatus, completion_date },
    })
    if (logErr) console.error('[update_task_status] activity_log failed:', logErr)

    return NextResponse.json({ ok: true, changed: true })
  } catch (err) {
    console.error('[update_task_status] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
