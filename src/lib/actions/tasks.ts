'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/dal'
import type { Database } from '@/types/supabase'

export type TaskStatus = Database['public']['Enums']['task_status']

const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'for_quality', 'na']
const ASSIGNEE_MAX_LENGTH = 120

// Faza 2c · P7 (statusy) + P8 (completion_date). Zmiana statusu zadania = odhaczanie.
// RLS: tasks „for all to authenticated using(true)" (R13) — każdy zalogowany PM może edytować.
// Klient serwerowy działa w sesji usera → RLS egzekwuje uprawnienia (NIE admin client).
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<{ ok: true } | { error: string }> {
  if (!VALID_STATUSES.includes(status)) {
    return { error: 'Nieprawidłowy status zadania.' }
  }

  const user = await requireUser() // przekierowuje na /login gdy brak sesji
  const supabase = await createClient()

  // Stan przed (audyt + ścieżka do revalidacji)
  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, status, project_id, completion_date')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono zadania.' }
  }

  if (before.status === status) {
    return { ok: true } // brak zmiany — nic nie zapisujemy
  }

  // completion_date (P8): ustaw na dziś przy przejściu na „done"; wyczyść gdy schodzimy z „done".
  // (data UTC z toISOString — spójna z resztą kodu; ewentualny edge późnego wieczoru PL akceptowalny)
  const today = new Date().toISOString().slice(0, 10)
  let completion_date = before.completion_date
  if (status === 'done') completion_date = before.completion_date ?? today
  else if (before.status === 'done') completion_date = null

  const { error: updErr } = await supabase
    .from('tasks')
    .update({ status, completion_date })
    .eq('id', taskId)

  if (updErr) {
    console.error('[updateTaskStatus] update failed:', updErr)
    return { error: 'Nie udało się zapisać statusu.' }
  }

  // Audyt A4 (nieblokujący)
  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'update_task_status',
    actor_id: user.id,
    before: { status: before.status },
    after: { status, completion_date },
  })
  if (logErr) console.error('[updateTaskStatus] activity_log failed:', logErr)

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}

// Faza 2c · P8 (owner). Zmiana osoby odpowiedzialnej zadania.
// assigneeName: null → brak osoby; ciąg → imię i nazwisko (max 120 znaków).
export async function updateTaskAssignee(
  taskId: string,
  assigneeName: string | null
): Promise<{ ok: true } | { error: string }> {
  const trimmed = assigneeName?.trim() ?? null
  if (trimmed !== null && (trimmed.length === 0 || trimmed.length > ASSIGNEE_MAX_LENGTH)) {
    return { error: 'Nieprawidłowa nazwa osoby.' }
  }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, assignee_name, project_id')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono zadania.' }
  }

  if (before.assignee_name === trimmed) {
    return { ok: true }
  }

  const { error: updErr } = await supabase
    .from('tasks')
    .update({ assignee_name: trimmed })
    .eq('id', taskId)

  if (updErr) {
    console.error('[updateTaskAssignee] update failed:', updErr)
    return { error: 'Nie udało się zapisać osoby odpowiedzialnej.' }
  }

  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'update_task_assignee',
    actor_id: user.id,
    before: { assignee_name: before.assignee_name },
    after: { assignee_name: trimmed },
  })
  if (logErr) console.error('[updateTaskAssignee] activity_log failed:', logErr)

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}
