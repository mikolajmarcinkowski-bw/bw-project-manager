'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/dal'
import type { Database } from '@/types/supabase'

// Type-only export — erased at runtime, safe in 'use server' module.
export type ImplType = Database['public']['Enums']['impl_type']

const VALID_IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

export async function createProjectAction(input: {
  client_id: string
  name: string
  variant?: 'dev' | 'standard'
  types: ImplType[]
  pm_ids: string[]
  start_date: string
  end_date?: string
  description?: string
  /** IDs szablonów zadań które PM oznaczył jako N/A przy tworzeniu (D-056). */
  na_template_ids?: string[]
}): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Nie jesteś zalogowany.' }
  }

  // Walidacja serwerowa
  const name = (input.name ?? '').trim()
  if (name.length === 0) return { error: 'Nazwa nie może być pusta.' }

  const client_id = (input.client_id ?? '').trim()
  if (!client_id) return { error: 'Klient jest wymagany.' }

  if (!Array.isArray(input.types) || input.types.length === 0) {
    return { error: 'Wymagany co najmniej jeden typ projektu.' }
  }
  for (const t of input.types) {
    if (!VALID_IMPL_TYPES.includes(t)) {
      return { error: `Nieprawidłowy typ projektu: ${t}.` }
    }
  }

  const start_date = (input.start_date ?? '').trim()
  if (!start_date) return { error: 'Data rozpoczęcia jest wymagana.' }
  if (isNaN(Date.parse(start_date))) {
    return { error: 'Data rozpoczęcia ma nieprawidłowy format (wymagane ISO).' }
  }
  if (start_date < '2000-01-01') {
    return { error: 'Data rozpoczęcia jest nierealistycznie wczesna.' }
  }

  const end_date = (input.end_date ?? '').trim() || null
  if (end_date) {
    if (isNaN(Date.parse(end_date))) {
      return { error: 'Deadline ma nieprawidłowy format.' }
    }
    if (end_date < start_date) {
      return { error: 'Deadline nie może być wcześniejszy niż data rozpoczęcia.' }
    }
  }
  const description = (input.description ?? '').trim() || null

  // PM = alokacja informacyjna; brak fallbacku. Pusta lista = projekt bez PM (przypisany później).
  const pm_ids: string[] = Array.isArray(input.pm_ids) ? input.pm_ids.filter(Boolean) : []

  // 1. Utwórz projekt
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      name,
      client_id,
      start_date,
      end_date,
      description,
      status: 'active',
      variant: input.variant === 'dev' ? 'dev' : 'standard',
    })
    .select('id')
    .single()

  if (projectError || !project) {
    console.error('[createProjectAction] projects insert failed:', projectError)
    return { error: 'Nie udało się utworzyć projektu. Spróbuj ponownie.' }
  }

  const projectId = project.id

  // Helper: best-effort cleanup on partial failure
  const cleanup = async () => {
    await supabase.from('projects').delete().eq('id', projectId)
  }

  // 2. Wstaw typy projektu
  const { error: typesError } = await supabase.from('project_types').insert(
    input.types.map((type) => ({ project_id: projectId, type }))
  )
  if (typesError) {
    console.error('[createProjectAction] project_types insert failed:', typesError)
    await cleanup()
    return { error: 'Nie udało się przypisać typów projektu. Spróbuj ponownie.' }
  }

  // 3. Wstaw PM-ów (tylko jeśli wybrano — projekt może powstać bez PM)
  if (pm_ids.length > 0) {
    const { error: pmsError } = await supabase.from('project_pms').insert(
      pm_ids.map((profile_id) => ({ project_id: projectId, profile_id }))
    )
    if (pmsError) {
      console.error('[createProjectAction] project_pms insert failed:', pmsError)
      await cleanup()
      return { error: 'Nie udało się przypisać kierowników projektu. Spróbuj ponownie.' }
    }
  }

  // 4. R15 — auto-insert kroków i zadań z szablonów (fazy 0..8, bez recurring)
  const { data: stepTemplates, error: stError } = await supabase
    .from('step_templates')
    .select(
      'id, phase_number, phase_name, step_order, step_title, kind, is_decision, is_parallel, is_recurring'
    )
    .in('phase_number', [0, 1, 2, 3, 4, 5, 6, 7, 8])
    .eq('is_recurring', false)
    .order('phase_number', { ascending: true })
    .order('step_order', { ascending: true })

  if (stError || !stepTemplates) {
    console.error('[createProjectAction] step_templates fetch failed:', stError)
    await cleanup()
    return { error: 'Nie udało się pobrać szablonów kroków. Spróbuj ponownie.' }
  }

  const stepTemplateIds = stepTemplates.map((t) => t.id)

  // Pobierz wszystkie task templates w jednym zapytaniu
  type TaskTemplateRow = {
    id: string
    step_template_id: string
    task_order: number
    task_title: string
    kind: Database['public']['Enums']['task_kind']
    applies_to_types: Database['public']['Enums']['impl_type'][]
    w_start: number | null
    w_end: number | null
    est: number | null
    is_milestone: boolean
  }

  let taskTemplates: TaskTemplateRow[] = []
  let ttError: unknown = null

  if (stepTemplateIds.length > 0) {
    const result = await supabase
      .from('step_task_templates')
      .select(
        'id, step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone'
      )
      .in('step_template_id', stepTemplateIds)
    taskTemplates = (result.data ?? []) as TaskTemplateRow[]
    ttError = result.error
  }

  if (ttError) {
    console.error('[createProjectAction] step_task_templates fetch failed:', ttError)
    await cleanup()
    return { error: 'Nie udało się pobrać szablonów zadań. Spróbuj ponownie.' }
  }

  // Zgrupuj task templates po step_template_id
  const tasksByStepTemplate = new Map<string, TaskTemplateRow[]>()
  for (const tt of taskTemplates) {
    const arr = tasksByStepTemplate.get(tt.step_template_id) ?? []
    arr.push(tt)
    tasksByStepTemplate.set(tt.step_template_id, arr)
  }

  const selectedTypesSet = new Set<string>(input.types)
  // Sanitizacja na_template_ids: akceptujemy tylko niepuste stringi (spójna walidacja jak types/start_date)
  const naSet = new Set<string>(
    Array.isArray(input.na_template_ids)
      ? input.na_template_ids.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : []
  )

  // Pętla: insert krok → pobierz id → batch insert jego zadań
  for (const st of stepTemplates) {
    const { data: insertedStep, error: stepInsertError } = await supabase
      .from('project_steps')
      .insert({
        project_id: projectId,
        step_template_id: st.id,
        phase_number: st.phase_number,
        phase_name: st.phase_name,
        step_order: st.step_order,
        step_title: st.step_title,
        kind: st.kind,
        is_decision: st.is_decision,
        is_parallel: st.is_parallel,
        is_recurring: false,
        status: 'todo',
        is_active: false,
      })
      .select('id')
      .single()

    if (stepInsertError || !insertedStep) {
      console.error('[createProjectAction] project_steps insert failed:', stepInsertError)
      await cleanup()
      return { error: 'Nie udało się utworzyć kroków projektu. Spróbuj ponownie.' }
    }

    const stepId = insertedStep.id
    const templates = tasksByStepTemplate.get(st.id) ?? []

    // R15: applies_to_types puste LUB przecina się z wybranymi typami
    const filteredTasks = templates.filter((tt) => {
      if (!tt.applies_to_types || tt.applies_to_types.length === 0) return true
      return tt.applies_to_types.some((t: string) => selectedTypesSet.has(t))
    })

    if (filteredTasks.length === 0) continue

    const { error: tasksInsertError } = await supabase.from('tasks').insert(
      filteredTasks.map((tt) => {
        const isNa = naSet.has(tt.id)
        return {
          step_id: stepId,
          project_id: projectId,
          task_order: tt.task_order,
          title: tt.task_title,
          kind: tt.kind,
          type: tt.applies_to_types as ImplType[],
          w_start: tt.w_start,
          w_end: tt.w_end,
          est: tt.est,
          is_milestone: tt.is_milestone,
          status: isNa ? ('na' as const) : ('todo' as const),
          hidden: isNa,
        }
      })
    )

    if (tasksInsertError) {
      console.error('[createProjectAction] tasks insert failed:', tasksInsertError)
      await cleanup()
      return { error: 'Nie udało się utworzyć zadań projektu. Spróbuj ponownie.' }
    }
  }

  // 5. Activity log (nieblokujące — błąd nie przerwie operacji)
  const { error: logError } = await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'create_project',
    actor_id: user.id,
    before: null,
    after: { name, client_id, types: input.types, start_date },
  })
  if (logError) {
    console.error('[createProjectAction] activity_log insert failed:', logError)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projekty')
  revalidatePath(`/clients/${client_id}`)

  return { ok: true, id: projectId }
}

export async function updateProjectAction(
  projectId: string,
  input: {
    name: string
    description?: string
    start_date: string
    end_date?: string
    types: ImplType[]
    pm_ids: string[]
  }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Nie jesteś zalogowany.' }
  }

  // Walidacja serwerowa
  const name = (input.name ?? '').trim()
  if (name.length === 0) return { error: 'Nazwa nie może być pusta.' }
  if (name.length > 200) return { error: 'Nazwa jest za długa (max 200 znaków).' }

  if (!Array.isArray(input.types) || input.types.length === 0) {
    return { error: 'Wymagany co najmniej jeden typ projektu.' }
  }
  for (const t of input.types) {
    if (!VALID_IMPL_TYPES.includes(t)) {
      return { error: `Nieprawidłowy typ projektu: ${t}.` }
    }
  }

  const start_date = (input.start_date ?? '').trim()
  if (!start_date) return { error: 'Data rozpoczęcia jest wymagana.' }
  if (isNaN(Date.parse(start_date))) {
    return { error: 'Data rozpoczęcia ma nieprawidłowy format (wymagane ISO).' }
  }
  if (start_date < '2000-01-01') {
    return { error: 'Data rozpoczęcia jest nierealistycznie wczesna.' }
  }

  const end_date = (input.end_date ?? '').trim() || null
  if (end_date) {
    if (isNaN(Date.parse(end_date))) {
      return { error: 'Deadline ma nieprawidłowy format.' }
    }
    if (end_date < start_date) {
      return { error: 'Deadline nie może być wcześniejszy niż data rozpoczęcia.' }
    }
  }

  const description = (input.description ?? '').trim() || null
  const pm_ids: string[] = Array.isArray(input.pm_ids) ? input.pm_ids.filter(Boolean) : []

  // Pobierz client_id do revalidatePath
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('client_id')
    .eq('id', projectId)
    .single()

  if (fetchError || !existing) {
    return { error: 'Projekt nie istnieje.' }
  }

  const client_id = existing.client_id

  // 1. Zaktualizuj projekt
  const { error: updateError } = await supabase
    .from('projects')
    .update({ name, description, start_date, end_date })
    .eq('id', projectId)

  if (updateError) {
    console.error('[updateProjectAction] projects update failed:', updateError)
    return { error: 'Nie udało się zaktualizować projektu. Spróbuj ponownie.' }
  }

  // 2. Zaktualizuj typy (delete + re-insert)
  const { error: typesDeleteError } = await supabase
    .from('project_types')
    .delete()
    .eq('project_id', projectId)

  if (typesDeleteError) {
    console.error('[updateProjectAction] project_types delete failed:', typesDeleteError)
    return { error: 'Nie udało się zaktualizować typów projektu. Spróbuj ponownie.' }
  }

  const { error: typesInsertError } = await supabase
    .from('project_types')
    .insert(input.types.map((type) => ({ project_id: projectId, type })))

  if (typesInsertError) {
    console.error('[updateProjectAction] project_types insert failed:', typesInsertError)
    return { error: 'Nie udało się zaktualizować typów projektu. Spróbuj ponownie.' }
  }

  // 3. Zaktualizuj PM-ów (delete + re-insert)
  const { error: pmsDeleteError } = await supabase
    .from('project_pms')
    .delete()
    .eq('project_id', projectId)

  if (pmsDeleteError) {
    console.error('[updateProjectAction] project_pms delete failed:', pmsDeleteError)
    return { error: 'Nie udało się zaktualizować kierowników projektu. Spróbuj ponownie.' }
  }

  if (pm_ids.length > 0) {
    const { error: pmsInsertError } = await supabase
      .from('project_pms')
      .insert(pm_ids.map((profile_id) => ({ project_id: projectId, profile_id })))

    if (pmsInsertError) {
      console.error('[updateProjectAction] project_pms insert failed:', pmsInsertError)
      return { error: 'Nie udało się zaktualizować kierowników projektu. Spróbuj ponownie.' }
    }
  }

  // 4. Activity log (nieblokujące)
  const { error: logError } = await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'update_project',
    actor_id: user.id,
    before: null,
    after: { name, types: input.types, start_date },
  })
  if (logError) {
    console.error('[updateProjectAction] activity_log insert failed:', logError)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projekty')
  revalidatePath(`/clients/${client_id}`)
  revalidatePath(`/projects/${projectId}`)

  return { ok: true }
}

// ─── markProjectCompleted (P21 — oznacz jako zakończony) ─────────────────────

export async function markProjectCompleted(projectId: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, status')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Nie znaleziono projektu.' }
  if (project.status !== 'active') return { error: 'Tylko aktywne projekty można oznaczać jako zakończone.' }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) return { error: 'Nie udało się zmienić statusu.' }

  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'mark_completed',
    actor_id: user.id,
    before: { status: 'active' },
    after: { status: 'completed' },
  })
  if (logErr) console.error('[markProjectCompleted] activity_log failed:', logErr)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/projekty')
  revalidatePath(`/clients/${project.client_id}`)

  return { ok: true }
}

// ─── archiveProject (P16 — archiwizacja z detonatorem) ───────────────────────

export async function archiveProject(projectId: string, confirmName: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, client_id, status')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Nie znaleziono projektu.' }
  if (project.status === 'archived') return { error: 'Projekt jest już zarchiwizowany.' }

  // Potwierdzenie nazwy projektu (detonator — R9)
  if (confirmName.trim().toLowerCase() !== project.name.trim().toLowerCase()) {
    return { error: 'Podana nazwa projektu nie zgadza się.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'archived',
      archived_by: user.id,
      archived_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (error) return { error: 'Nie udało się zarchiwizować projektu.' }

  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'archive_project',
    actor_id: user.id,
    before: { status: project.status },
    after: { status: 'archived' },
  })
  if (logErr) console.error('[archiveProject] activity_log failed:', logErr)

  revalidatePath('/dashboard')
  revalidatePath('/projekty')
  revalidatePath('/archiwum')
  revalidatePath(`/clients/${project.client_id}`)

  return { ok: true }
}

// ─── updateDecisionPoint (P11 — diamenciki) ───────────────────────────────────

export async function updateDecisionPoint(
  decisionId: string,
  status: 'yes' | 'no' | 'pending',
  notes?: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  // Pobierz decision (potrzebujemy project_id do revalidatePath i status do loga)
  const { data: before, error: fetchErr } = await supabase
    .from('decision_points')
    .select('id, project_id, status')
    .eq('id', decisionId)
    .single()

  if (fetchErr || !before) {
    return { error: 'Nie znaleziono decyzji.' }
  }

  const { error: updateErr } = await supabase
    .from('decision_points')
    .update({
      status,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', decisionId)

  if (updateErr) {
    console.error('[updateDecisionPoint] update failed:', updateErr)
    return { error: 'Nie udało się zaktualizować decyzji. Spróbuj ponownie.' }
  }

  // Activity log (nieblokujące)
  const { error: logErr } = await supabase.from('activity_log').insert({
    entity: 'decision',
    entity_id: decisionId,
    action: 'update_decision',
    actor_id: user.id,
    before: { status: before.status },
    after: { status, notes: notes ?? null },
  })
  if (logErr) {
    console.error('[updateDecisionPoint] activity_log failed:', logErr)
  }

  revalidatePath(`/projects/${before.project_id}`)

  return { ok: true }
}
