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

  // hidden (P9): na=ukryte, każdy inny status=widoczne.
  const hidden = status === 'na'

  const { error: updErr } = await supabase
    .from('tasks')
    .update({ status, completion_date, hidden })
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

// ---------------------------------------------------------------------------
// updateTaskPmAssignee — PM nadzorujący zadanie (FK do profiles, D-057)
// ---------------------------------------------------------------------------
export async function updateTaskPmAssignee(
  taskId: string,
  profileId: string | null
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, pm_assignee_id, project_id')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono zadania.' }
  }

  if (before.pm_assignee_id === profileId) {
    return { ok: true }
  }

  const { error: updErr } = await supabase
    .from('tasks')
    .update({ pm_assignee_id: profileId })
    .eq('id', taskId)

  if (updErr) {
    console.error('[updateTaskPmAssignee] update failed:', updErr)
    return { error: 'Nie udało się zapisać PM-a.' }
  }

  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'update_task_pm',
    actor_id: user.id,
    before: { pm_assignee_id: before.pm_assignee_id },
    after: { pm_assignee_id: profileId },
  })
  if (logErr) console.error('[updateTaskPmAssignee] activity_log failed:', logErr)

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// updateTaskEst — edycja estymacji zadania (h) z auto-sync powiązanej budget_line.est_h
// ---------------------------------------------------------------------------
export async function updateTaskEst(
  taskId: string,
  est: number | null
): Promise<{ ok: true } | { error: string }> {
  if (est !== null) {
    if (!Number.isFinite(est) || est < 0 || est > 9999) {
      return { error: 'Nieprawidłowa wartość estymacji (0–9999h).' }
    }
    // zaokrąglamy do 0.5h
    est = Math.round(est * 2) / 2
  }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, est, project_id')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) return { error: 'Nie znaleziono zadania.' }
  if (before.est === est) return { ok: true }

  const { error: updErr } = await supabase
    .from('tasks')
    .update({ est })
    .eq('id', taskId)

  if (updErr) {
    console.error('[updateTaskEst] update failed:', updErr)
    return { error: 'Nie udało się zapisać estymacji.' }
  }

  // Synchronizuj powiązaną linię budżetową (jeśli jest — budget_lines.task_id = task.id)
  if (est !== null) {
    await supabase
      .from('budget_lines')
      .update({ est_h: est })
      .eq('task_id', taskId)
  }

  await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'update_task_est',
    actor_id: user.id,
    before: { est: before.est },
    after: { est },
  }).then(({ error }) => { if (error) console.error('[updateTaskEst] log failed:', error) })

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}

// Faza 2c · P18 — Edycja terminu zadania z potwierdzeniem (R6/D-022).
// Wymaga wpisania słowa „change" w UI przed wywołaniem (walidacja client-side).
// Automatycznie zeruje warning_muted gdy data się zmienia (R5c).
export async function updateTaskDueDate(
  taskId: string,
  newDate: string | null
): Promise<{ ok: true } | { error: string }> {
  if (newDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return { error: 'Nieprawidłowy format daty (wymagane RRRR-MM-DD).' }
    }
    if (newDate < '2000-01-01') {
      return { error: 'Data jest nierealistycznie wczesna.' }
    }
  }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, due_date, project_id, warning_muted')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono zadania.' }
  }

  if (before.due_date === newDate) {
    return { ok: true }
  }

  const { error: updErr } = await supabase
    .from('tasks')
    .update({
      due_date: newDate,
      // Zmiana daty gasi aktywne wyciszenie (R5c) — PM potwierdza nową datę
      ...(before.warning_muted ? { warning_muted: false, muted_at: null, muted_by: null } : {}),
    })
    .eq('id', taskId)

  if (updErr) {
    console.error('[updateTaskDueDate] update failed:', updErr)
    return { error: 'Nie udało się zapisać terminu.' }
  }

  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'update_task_due_date',
    actor_id: user.id,
    before: { due_date: before.due_date },
    after: { due_date: newDate },
  })
  if (logErr) console.error('[updateTaskDueDate] activity_log failed:', logErr)

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}

// Faza 2c · P19 — Wyciszanie alertu zadania.
// Idempotent: ponowne wywołanie dla już wyciszonego zadania zwraca { ok: true } bez zapisu.
// Automatycznie cofane przez updateTaskDueDate gdy PM zmienia termin (R5c).
export async function muteTaskWarning(
  taskId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, project_id, warning_muted')
    .eq('id', taskId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono zadania.' }
  }

  if (before.warning_muted === true) {
    return { ok: true } // idempotent
  }

  const { error: updErr } = await supabase
    .from('tasks')
    .update({
      warning_muted: true,
      muted_at: new Date().toISOString(),
      muted_by: user.id,
    })
    .eq('id', taskId)

  if (updErr) {
    console.error('[muteTaskWarning] update failed:', updErr)
    return { error: 'Nie udało się wyciszyć alertu.' }
  }

  // Audyt A4 (nieblokujący)
  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'task',
    entity_id: taskId,
    action: 'mute_task_warning',
    actor_id: user.id,
    before: { warning_muted: false },
    after: { warning_muted: true },
  })
  if (logErr) console.error('[muteTaskWarning] activity_log failed:', logErr)

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}

// Historia zmian terminu zadania — do wyświetlenia w modalu P18.
export async function getTaskDateHistory(taskId: string): Promise<
  { actorName: string | null; before: string | null; after: string | null; at: string }[]
> {
  await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('before, after, created_at, actor_id, profiles(full_name)')
    .eq('entity_id', taskId)
    .eq('action', 'update_task_due_date')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !data) {
    console.error('[getTaskDateHistory] fetch failed:', error)
    return []
  }

  return data.map((row) => {
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const b = (row.before as { due_date?: string | null } | null)?.due_date ?? null
    const a = (row.after as { due_date?: string | null } | null)?.due_date ?? null
    return {
      actorName: (prof as { full_name?: string | null } | null)?.full_name ?? null,
      before: b,
      after: a,
      at: row.created_at,
    }
  })
}
