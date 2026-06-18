import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const MAX_TASK_IDS = 100

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

  const { task_ids } = body as Record<string, unknown>

  if (!Array.isArray(task_ids)) {
    return NextResponse.json({ ok: false, error: 'task_ids musi byc tablicą.' }, { status: 400 })
  }
  if (task_ids.length === 0) {
    return NextResponse.json({ ok: false, error: 'task_ids nie moze byc pusta.' }, { status: 400 })
  }
  if (task_ids.length > MAX_TASK_IDS) {
    return NextResponse.json(
      { ok: false, error: `task_ids nie moze zawierac wiecej niz ${MAX_TASK_IDS} elementow.` },
      { status: 400 }
    )
  }
  for (const id of task_ids) {
    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ ok: false, error: 'Kazdy element task_ids musi byc niepustym stringiem.' }, { status: 400 })
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
      return NextResponse.json({ ok: false, error: 'Nie znaleziono zadania (task_ids[0]).' }, { status: 404 })
    }

    const projectId = (firstTask as { id: string; project_id: string }).project_id

    // Batch update: hidden=true, status='na'
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ hidden: true, status: 'na' })
      .in('id', validIds)

    if (updErr) {
      console.error('[bulk_hide_tasks] update failed:', updErr)
      return NextResponse.json({ ok: false, error: 'Nie udalo sie ukryc zadan.' }, { status: 500 })
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
      { ok: false, error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
