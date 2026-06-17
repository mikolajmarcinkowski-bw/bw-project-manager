import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_TASK_IDS = 100

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

  const { task_ids } = body as Record<string, unknown>

  if (!Array.isArray(task_ids)) {
    return NextResponse.json({ error: 'task_ids musi byc tablicą.' }, { status: 400 })
  }
  if (task_ids.length === 0) {
    return NextResponse.json({ error: 'task_ids nie moze byc pusta.' }, { status: 400 })
  }
  if (task_ids.length > MAX_TASK_IDS) {
    return NextResponse.json(
      { error: `task_ids nie moze zawierac wiecej niz ${MAX_TASK_IDS} elementow.` },
      { status: 400 }
    )
  }
  for (const id of task_ids) {
    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'Kazdy element task_ids musi byc niepustym stringiem.' }, { status: 400 })
    }
  }

  const validIds = (task_ids as string[]).map((id) => id.trim())
  const supabase = createAdminClient()

  try {
    // Pobierz project_id z pierwszego zadania (do activity_log)
    const { data: firstTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', validIds[0])
      .single()

    if (fetchErr || !firstTask) {
      return NextResponse.json({ error: 'Nie znaleziono zadania (task_ids[0]).' }, { status: 404 })
    }

    const projectId = (firstTask as { id: string; project_id: string }).project_id

    // Batch update: hidden=true, status='na'
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ hidden: true, status: 'na' })
      .in('id', validIds)

    if (updErr) {
      console.error('[bulk_hide_tasks] update failed:', updErr)
      return NextResponse.json({ error: 'Nie udalo sie ukryc zadan.' }, { status: 500 })
    }

    // Jedno zbiorcze activity_log
    const { error: logErr } = await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: projectId,
      action: 'bulk_hide_tasks',
      actor_id: userId,
      before: null,
      after: { task_ids: validIds, hidden: true, status: 'na' },
    })
    if (logErr) console.error('[bulk_hide_tasks] activity_log failed:', logErr)

    return NextResponse.json({ ok: true, hidden_count: validIds.length })
  } catch (err) {
    console.error('[bulk_hide_tasks] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
