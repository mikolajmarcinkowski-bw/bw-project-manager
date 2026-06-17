import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_STATUSES = ['todo', 'in_progress', 'done', 'for_quality', 'na'] as const
type TaskStatus = (typeof VALID_STATUSES)[number]

const VALID_KINDS = ['ws', 'own', 'config', 'test', 'ms', 'pm'] as const
type TaskKind = (typeof VALID_KINDS)[number]

const ASSIGNEE_MAX_LENGTH = 120

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

  const bodyObj = body as Record<string, unknown>
  const { task_id } = bodyObj

  if (!task_id || typeof task_id !== 'string') {
    return NextResponse.json({ error: 'task_id jest wymagany.' }, { status: 400 })
  }

  // Buduj update object — tylko pola ktore sa przekazane (nie undefined)
  const updatePayload: Record<string, unknown> = {}
  const afterLog: Record<string, unknown> = {}
  const changesFound: string[] = []

  // assignee_name: string | null
  if ('assignee_name' in bodyObj) {
    const v = bodyObj.assignee_name
    const trimmed = v === null ? null : typeof v === 'string' ? v.trim() || null : null
    if (trimmed !== null && trimmed.length > ASSIGNEE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `assignee_name nie moze przekraczac ${ASSIGNEE_MAX_LENGTH} znakow.` },
        { status: 400 }
      )
    }
    updatePayload.assignee_name = trimmed
    afterLog.assignee_name = trimmed
    changesFound.push('assignee_name')
  }

  // status: whitelist
  if ('status' in bodyObj) {
    const v = bodyObj.status
    if (typeof v !== 'string' || !VALID_STATUSES.includes(v as TaskStatus)) {
      return NextResponse.json(
        {
          error: `Nieprawidlowy status: ${v}. Dozwolone: ${VALID_STATUSES.join(', ')}.`,
        },
        { status: 400 }
      )
    }
    updatePayload.status = v as TaskStatus
    // Sync hidden z status (na → true, inne → false)
    updatePayload.hidden = v === 'na'
    afterLog.status = v
    changesFound.push('status')
  }

  // due_date: YYYY-MM-DD lub null
  if ('due_date' in bodyObj) {
    const v = bodyObj.due_date
    if (v === null) {
      updatePayload.due_date = null
      afterLog.due_date = null
    } else if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return NextResponse.json(
          { error: 'due_date ma nieprawidlowy format (wymagane YYYY-MM-DD).' },
          { status: 400 }
        )
      }
      updatePayload.due_date = trimmed || null
      afterLog.due_date = trimmed || null
    } else {
      return NextResponse.json({ error: 'due_date musi byc stringiem lub null.' }, { status: 400 })
    }
    changesFound.push('due_date')
  }

  // hidden: boolean — niezalezne od statusu jesli przekazane explicite
  if ('hidden' in bodyObj) {
    const v = bodyObj.hidden
    if (typeof v !== 'boolean') {
      return NextResponse.json({ error: 'hidden musi byc boolean.' }, { status: 400 })
    }
    updatePayload.hidden = v
    afterLog.hidden = v
    changesFound.push('hidden')
  }

  // kind: whitelist
  if ('kind' in bodyObj) {
    const v = bodyObj.kind
    if (typeof v !== 'string' || !VALID_KINDS.includes(v as TaskKind)) {
      return NextResponse.json(
        { error: `Nieprawidlowy kind: ${v}. Dozwolone: ${VALID_KINDS.join(', ')}.` },
        { status: 400 }
      )
    }
    updatePayload.kind = v as TaskKind
    afterLog.kind = v
    changesFound.push('kind')
  }

  // est: number | null
  if ('est' in bodyObj) {
    const v = bodyObj.est
    if (v !== null && typeof v !== 'number') {
      return NextResponse.json({ error: 'est musi byc liczba lub null.' }, { status: 400 })
    }
    updatePayload.est = v as number | null
    afterLog.est = v
    changesFound.push('est')
  }

  // note: string | null
  if ('note' in bodyObj) {
    const v = bodyObj.note
    const noteVal =
      v === null ? null : typeof v === 'string' ? v.trim() || null : null
    updatePayload.note = noteVal
    afterLog.note = noteVal
    changesFound.push('note')
  }

  if (changesFound.length === 0) {
    return NextResponse.json({ error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // Pobierz stan przed zmiana
    const { data: before, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, project_id, status, assignee_name, due_date, hidden, kind, est, note')
      .eq('id', task_id)
      .single()

    if (fetchErr || !before) {
      return NextResponse.json({ error: 'Nie znaleziono zadania.' }, { status: 404 })
    }

    const beforeTyped = before as {
      id: string
      project_id: string
      status: string
      assignee_name: string | null
      due_date: string | null
      hidden: boolean
      kind: string
      est: number | null
      note: string | null
    }

    // Jesli status zmienia sie na done i completion_date nie podane — ustaw dzisiaj
    if (updatePayload.status === 'done' && !('completion_date' in updatePayload)) {
      const today = new Date().toISOString().slice(0, 10)
      updatePayload.completion_date = today
      afterLog.completion_date = today
    } else if (
      typeof updatePayload.status === 'string' &&
      updatePayload.status !== 'done' &&
      beforeTyped.status === 'done'
    ) {
      updatePayload.completion_date = null
      afterLog.completion_date = null
    }

    const { error: updErr } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', task_id)

    if (updErr) {
      console.error('[update_task] update failed:', updErr)
      return NextResponse.json({ error: 'Nie udalo sie zaktualizowac zadania.' }, { status: 500 })
    }

    // Buduj before log — tylko zmieniane pola
    const beforeLog: Record<string, unknown> = {}
    for (const key of changesFound) {
      beforeLog[key] = (beforeTyped as Record<string, unknown>)[key]
    }

    // Activity log (nieblokujace)
    const { error: logErr } = await supabase.from('activity_log').insert({
      entity: 'task',
      entity_id: task_id,
      action: 'update_task',
      actor_id: userId,
      before: beforeLog,
      after: afterLog,
    })
    if (logErr) console.error('[update_task] activity_log failed:', logErr)

    return NextResponse.json({ ok: true, updated: changesFound })
  } catch (err) {
    console.error('[update_task] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
