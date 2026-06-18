import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const ASSIGNEE_MAX_LENGTH = 120

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { task_id, assignee_name, completion_date } = body as Record<string, unknown>

  if (!task_id || typeof task_id !== 'string') {
    return NextResponse.json({ ok: false, error: 'task_id jest wymagany.' }, { status: 400 })
  }

  // assignee_name: null (usun) lub string (max 120)
  const trimmedAssignee =
    assignee_name === null || assignee_name === undefined
      ? null
      : typeof assignee_name === 'string'
        ? assignee_name.trim() || null
        : null

  if (trimmedAssignee !== null && trimmedAssignee.length > ASSIGNEE_MAX_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `assignee_name nie moze przekraczac ${ASSIGNEE_MAX_LENGTH} znakow.` },
      { status: 400 }
    )
  }

  // completion_date: opcjonalne, format YYYY-MM-DD lub null
  let completionDateVal: string | null | undefined = undefined
  if ('completion_date' in (body as object)) {
    if (completion_date === null) {
      completionDateVal = null
    } else if (typeof completion_date === 'string') {
      const trimmed = completion_date.trim()
      if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return NextResponse.json(
          { ok: false, error: 'completion_date ma nieprawidlowy format (wymagane YYYY-MM-DD).' },
          { status: 400 }
        )
      }
      completionDateVal = trimmed || null
    } else {
      return NextResponse.json({ ok: false, error: 'completion_date musi byc stringiem lub null.' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  try {
    // Pobierz stan przed zmiana
    const { data: before, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, assignee_name, project_id, completion_date')
      .eq('id', task_id)
      .single()

    if (fetchErr || !before) {
      return NextResponse.json({ ok: false, error: 'Nie znaleziono zadania.' }, { status: 404 })
    }

    const beforeTyped = before as {
      id: string
      assignee_name: string | null
      project_id: string
      completion_date: string | null
    }

    // Buduj update object
    const updatePayload: Record<string, unknown> = {
      assignee_name: trimmedAssignee,
    }
    if (completionDateVal !== undefined) {
      updatePayload.completion_date = completionDateVal
    }

    const { error: updErr } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', task_id)

    if (updErr) {
      console.error('[set_task_owner] update failed:', updErr)
      return NextResponse.json({ ok: false, error: 'Nie udalo sie zapisac wlasciciela zadania.' }, { status: 500 })
    }

    // Activity log (nieblokujace)
    const afterLog: Record<string, unknown> = { assignee_name: trimmedAssignee }
    if (completionDateVal !== undefined) afterLog.completion_date = completionDateVal

    const { error: logErr } = await supabase.from('activity_log').insert({
      entity: 'task',
      entity_id: task_id,
      action: 'set_task_owner',
      actor_id: userId,
      before: { assignee_name: beforeTyped.assignee_name },
      after: afterLog,
    })
    if (logErr) console.error('[set_task_owner] activity_log failed:', logErr)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[set_task_owner] Unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
