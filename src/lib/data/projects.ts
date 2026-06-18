// Read-only data layer for server components.
// No 'use server' directive — this is not a Server Actions file.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ImplType } from '@/lib/actions/projects'

// Re-export for consumers who only import from this module
export type { ImplType }

type Db = Awaited<ReturnType<typeof createClient>>

// Zbiór id projektów „zagrożonych" (P13/R5). Sygnał odpala gdy:
//  - zadanie po terminie: due_date < dziś i status ≠ done/na, LUB
//  - aktywny projekt po deadline: status 'active' i end_date < dziś.
// (Daty PMI per-zadanie ustawiane są w realizacji; do tego czasu deadline projektu daje sygnał.)
async function getAtRiskProjectIds(supabase: Db, projectIds?: string[]): Promise<Set<string>> {
  const today = new Date().toISOString().slice(0, 10)
  const ids = new Set<string>()

  let tasksQuery = supabase
    .from('tasks')
    .select('project_id')
    .lt('due_date', today)
    .not('status', 'in', '(done,na)')
  if (projectIds) tasksQuery = tasksQuery.in('project_id', projectIds)
  const { data: riskTasks, error: tasksErr } = await tasksQuery
  if (tasksErr) console.error('[getAtRiskProjectIds] tasks:', tasksErr)
  for (const t of riskTasks ?? []) ids.add(t.project_id)

  let projQuery = supabase
    .from('projects')
    .select('id')
    .eq('status', 'active')
    .lt('end_date', today)
  if (projectIds) projQuery = projQuery.in('id', projectIds)
  const { data: riskProjects, error: projErr } = await projQuery
  if (projErr) console.error('[getAtRiskProjectIds] projects:', projErr)
  for (const p of riskProjects ?? []) ids.add(p.id)

  return ids
}

// ─── getClientsBasic — tylko id+name, do dropdownów filtrów (1 query) ────────

export async function getClientsBasic(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })
  if (error || !data) return []
  return data
}

// ─── getClientsWithStats ──────────────────────────────────────────────────────

export async function getClientsWithStats(): Promise<
  { id: string; name: string; projectCount: number; activeCount: number; atRisk: boolean }[]
> {
  const supabase = await createClient()

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  if (clientsError || !clients) {
    console.error('[getClientsWithStats] clients fetch failed:', clientsError)
    return []
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, client_id, status')

  if (projectsError || !projects) {
    console.error('[getClientsWithStats] projects fetch failed:', projectsError)
    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      projectCount: 0,
      activeCount: 0,
      atRisk: false,
    }))
  }

  const riskProjectIds = await getAtRiskProjectIds(supabase)

  const projectsByClient = new Map<string, typeof projects>()
  for (const p of projects) {
    const arr = projectsByClient.get(p.client_id) ?? []
    arr.push(p)
    projectsByClient.set(p.client_id, arr)
  }

  return clients
    .map((c) => {
      const clientProjects = projectsByClient.get(c.id) ?? []
      const activeCount = clientProjects.filter((p) => p.status === 'active').length
      const atRisk = clientProjects.some((p) => riskProjectIds.has(p.id))
      return {
        id: c.id,
        name: c.name,
        projectCount: clientProjects.length,
        activeCount,
        atRisk,
      }
    })
    // Zagrożone teczki na górę (P13 — sygnał ma się rzucać w oczy)
    .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || a.name.localeCompare(b.name, 'pl'))
}

// ─── getAllProjects ────────────────────────────────────────────────────────────

export async function getAllProjects(filters?: {
  status?: string
  type?: ImplType
  clientId?: string
  pmId?: string
  atRiskOnly?: boolean
}): Promise<
  Array<{
    id: string
    name: string
    clientId: string
    clientName: string
    status: string
    types: ImplType[]
    startDate: string | null
    endDate: string | null
    atRisk: boolean
  }>
> {
  const supabase = await createClient()

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, client_id, status, start_date, end_date, clients(name)')

  if (filters?.status) {
    projectsQuery = projectsQuery.eq('status', filters.status)
  }
  if (filters?.clientId) {
    projectsQuery = projectsQuery.eq('client_id', filters.clientId)
  }

  const { data: projectsRaw, error: projectsError } = await projectsQuery.order('created_at', {
    ascending: false,
  })

  if (projectsError || !projectsRaw) {
    console.error('[getAllProjects] projects fetch failed:', projectsError)
    return []
  }

  const { data: allTypes, error: typesError } = await supabase
    .from('project_types')
    .select('project_id, type')

  if (typesError) {
    console.error('[getAllProjects] project_types fetch failed:', typesError)
  }

  let pmProjectIds: Set<string> | null = null
  if (filters?.pmId) {
    const { data: pmRows, error: pmError } = await supabase
      .from('project_pms')
      .select('project_id')
      .eq('profile_id', filters.pmId)

    if (pmError) {
      console.error('[getAllProjects] project_pms fetch failed:', pmError)
    }
    pmProjectIds = new Set((pmRows ?? []).map((r) => r.project_id))
  }

  const riskProjectIds = await getAtRiskProjectIds(supabase)

  const typesByProject = new Map<string, ImplType[]>()
  for (const row of allTypes ?? []) {
    const arr = typesByProject.get(row.project_id) ?? []
    arr.push(row.type as ImplType)
    typesByProject.set(row.project_id, arr)
  }

  const results = projectsRaw
    .map((p) => {
      const clientsField = p.clients
      const clientRow = Array.isArray(clientsField)
        ? (clientsField[0] as { name: string } | undefined) ?? null
        : (clientsField as { name: string } | null)

      return {
        id: p.id,
        name: p.name,
        clientId: p.client_id,
        clientName: clientRow?.name ?? '',
        status: p.status,
        types: typesByProject.get(p.id) ?? [],
        startDate: p.start_date ?? null,
        endDate: p.end_date ?? null,
        atRisk: riskProjectIds.has(p.id),
      }
    })
    .filter((p) => {
      if (filters?.type && !p.types.includes(filters.type)) return false
      if (pmProjectIds !== null && !pmProjectIds.has(p.id)) return false
      if (filters?.atRiskOnly && !p.atRisk) return false
      return true
    })

  return results
}

// ─── getProfiles ──────────────────────────────────────────────────────────────

export async function getProfiles(): Promise<{ id: string; full_name: string | null }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error || !data) {
    console.error('[getProfiles] fetch failed:', error)
    return []
  }

  return data
}

// ─── getProjectDetail (widok Gantt — P5/P6/P11/P12) ─────────────────────────────

export type StepStatus = 'todo' | 'in_progress' | 'done' | 'skipped'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'for_quality' | 'na'
export type TaskKind = 'ws' | 'own' | 'config' | 'test' | 'ms' | 'pm'
export type MilestoneStatus = 'on' | 'at' | 'off' | 'done'
export type DecisionType = 'uat' | 'change_request' | 'deviation' | 'other'
export type DecisionStatus = 'pending' | 'yes' | 'no'

export interface GanttTask {
  id: string
  title: string
  status: TaskStatus
  kind: TaskKind
  est: number | null
  wStart: number | null
  wEnd: number | null
  assigneeName: string | null
  isMilestone: boolean
  hidden: boolean
  /** Typy wdrożenia zadania (CRM/SPO/INT/MKT/ERP) — kolumna „Typ" w Gantcie. */
  types: ImplType[]
  /** Termin zadania (do alertów „po terminie"). */
  dueDate: string | null
  /** Data faktycznego ukończenia (P8 — auto-ustawiana gdy status → done). */
  completionDate: string | null
  /** P19: alert wyciszony przez PM (true = brak przycisku + opacity-60 + etykieta). */
  warningMuted: boolean
}

export interface GanttStep {
  id: string
  phaseNumber: number
  phaseName: string
  stepTitle: string
  status: StepStatus
  isActive: boolean
  isParallel: boolean
  isRecurring: boolean
  isDecision: boolean
  /** Rozpiętość wyliczona z tygodni zadań (null gdy krok bez zadań). */
  wStart: number | null
  wEnd: number | null
  tasks: GanttTask[]
}

export interface ProjectDetail {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  /** Data startu tylko jeśli sensowna (≥ rok 2000) — inaczej oś = tygodnie względne. */
  calendarStart: string | null
  weekCount: number
  types: ImplType[]
  client: { id: string; name: string }
  pms: { id: string; fullName: string | null }[]
  atRisk: boolean
  steps: GanttStep[]
  milestones: { id: string; msCode: string | null; name: string; week: number | null; status: MilestoneStatus }[]
  decisions: {
    id: string
    type: DecisionType
    status: DecisionStatus
    title: string
    stepId: string | null
    decidedBy: string | null
    decidedAt: string | null
    notes: string | null
    decidedByName: string | null
  }[]
}

// cache(): trasa woła getProjectDetail dwa razy (generateMetadata + page) —
// React cache dedupuje w obrębie jednego requestu.
export const getProjectDetail = cache(async (projectId: string): Promise<ProjectDetail | null> => {
  const supabase = await createClient()

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name, description, status, start_date, end_date, client_id, clients(id, name)')
    .eq('id', projectId)
    .single()

  if (projErr || !project) {
    console.error('[getProjectDetail] project fetch failed:', projErr)
    return null
  }

  const [
    { data: typesRows, error: typesErr },
    { data: stepsRows, error: stepsErr },
    { data: taskRows, error: tasksErr },
    { data: msRows, error: msErr },
    { data: decRows, error: decErr },
    { data: pmRows, error: pmErr },
  ] = await Promise.all([
    supabase.from('project_types').select('type').eq('project_id', projectId),
    supabase
      .from('project_steps')
      .select('id, phase_number, phase_name, step_title, status, is_active, is_parallel, is_recurring, is_decision, step_order')
      .eq('project_id', projectId)
      .order('phase_number', { ascending: true })
      .order('step_order', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, step_id, title, status, kind, est, w_start, w_end, assignee_name, is_milestone, hidden, type, due_date, completion_date, warning_muted, task_order')
      .eq('project_id', projectId)
      .order('task_order', { ascending: true }),
    supabase.from('milestones').select('id, ms_code, name, week, status').eq('project_id', projectId),
    supabase.from('decision_points').select('id, type, status, title, step_id, decided_by, decided_at, notes, profiles(full_name)').eq('project_id', projectId),
    supabase.from('project_pms').select('profiles(id, full_name)').eq('project_id', projectId),
  ])

  if (typesErr) console.error('[getProjectDetail] types:', typesErr)
  if (stepsErr) console.error('[getProjectDetail] steps:', stepsErr)
  if (tasksErr) console.error('[getProjectDetail] tasks:', tasksErr)
  if (msErr) console.error('[getProjectDetail] milestones:', msErr)
  if (decErr) console.error('[getProjectDetail] decisions:', decErr)
  if (pmErr) console.error('[getProjectDetail] pms:', pmErr)

  // Zadania pogrupowane wg kroku
  const tasksByStep = new Map<string, GanttTask[]>()
  for (const t of taskRows ?? []) {
    const arr = tasksByStep.get(t.step_id) ?? []
    arr.push({
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      kind: t.kind as TaskKind,
      est: t.est,
      wStart: t.w_start,
      wEnd: t.w_end,
      assigneeName: t.assignee_name,
      isMilestone: t.is_milestone,
      hidden: t.hidden ?? false,
      types: (t.type ?? []) as ImplType[],
      dueDate: t.due_date ?? null,
      completionDate: t.completion_date ?? null,
      warningMuted: t.warning_muted ?? false,
    })
    tasksByStep.set(t.step_id, arr)
  }

  const steps: GanttStep[] = (stepsRows ?? []).map((s) => {
    const tasks = tasksByStep.get(s.id) ?? []
    // Fallback na drugi bound gdy zadanie ma tylko jeden (chroni przed znikaniem paska)
    const starts = tasks.map((t) => t.wStart ?? t.wEnd).filter((w): w is number => w != null)
    const ends = tasks.map((t) => t.wEnd ?? t.wStart).filter((w): w is number => w != null)

    // Zadania które liczą się do statusu fazy: widoczne, nie-N/A, nie-milestone
    const activeTasks = tasks.filter((t) => !t.hidden && t.status !== 'na' && !t.isMilestone)

    // Status fazy wyprowadzany z zadań (Opcja A — D-037 / automatyczny):
    //   skipped = ręczna decyzja z DB (zachowujemy)
    //   done    = wszystkie aktywne zadania done
    //   in_progress = przynajmniej jedno in_progress lub for_quality
    //   todo    = żadne nie zaczęte
    //   brak zadań = zostawiamy wartość z DB
    const derivedStatus: StepStatus = (() => {
      if (s.status === 'skipped') return 'skipped'
      if (activeTasks.length === 0) return s.status as StepStatus
      if (activeTasks.some((t) => t.status === 'in_progress' || t.status === 'for_quality')) return 'in_progress'
      if (activeTasks.every((t) => t.status === 'done')) return 'done'
      return 'todo'
    })()

    // isActive = „TU JESTEŚ" na Mapie klocków: faza jest aktywna gdy trwa w niej praca
    const derivedIsActive = activeTasks.some(
      (t) => t.status === 'in_progress' || t.status === 'for_quality'
    )

    return {
      id: s.id,
      phaseNumber: s.phase_number,
      phaseName: s.phase_name,
      stepTitle: s.step_title,
      status: derivedStatus,
      isActive: derivedIsActive,
      isParallel: s.is_parallel,
      isRecurring: s.is_recurring,
      isDecision: s.is_decision,
      wStart: starts.length ? Math.min(...starts) : null,
      wEnd: ends.length ? Math.max(...ends) : null,
      tasks,
    }
  })

  const milestones = (msRows ?? []).map((m) => ({
    id: m.id,
    msCode: m.ms_code,
    name: m.name,
    week: m.week,
    status: m.status as MilestoneStatus,
  }))

  // Liczba tygodni osi = max z (końców kroków, tygodni milestone); min. 8.
  const allEnds = [
    ...steps.map((s) => s.wEnd ?? 0),
    ...milestones.map((m) => m.week ?? 0),
  ]
  const weekCount = Math.max(8, ...allEnds)

  // Data startu sensowna tylko jeśli ≥ 2000 (chroni przed śmieciowymi datami testowymi)
  const startYear = project.start_date ? Number(project.start_date.slice(0, 4)) : 0
  const calendarStart = startYear >= 2000 ? project.start_date : null

  const clientField = Array.isArray(project.clients) ? project.clients[0] : project.clients
  const riskIds = await getAtRiskProjectIds(supabase, [projectId])

  const pms = (pmRows ?? [])
    .map((r) => {
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return prof ? { id: prof.id, fullName: prof.full_name } : null
    })
    .filter((x): x is { id: string; fullName: string | null } => x != null)

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status,
    startDate: project.start_date ?? null,
    endDate: project.end_date ?? null,
    calendarStart,
    weekCount,
    types: (typesRows ?? []).map((r) => r.type as ImplType),
    client: { id: clientField?.id ?? '', name: clientField?.name ?? '' },
    pms,
    atRisk: riskIds.has(projectId),
    steps,
    milestones,
    decisions: (decRows ?? []).map((d) => {
      const profField = (d as unknown as { profiles: { full_name: string | null } | { full_name: string | null }[] | null }).profiles
      const profRow = Array.isArray(profField)
        ? (profField[0] as { full_name: string | null } | undefined) ?? null
        : (profField as { full_name: string | null } | null)
      return {
        id: d.id,
        type: d.type as DecisionType,
        status: d.status as DecisionStatus,
        title: d.title,
        stepId: d.step_id,
        decidedBy: (d as unknown as { decided_by: string | null }).decided_by ?? null,
        decidedAt: (d as unknown as { decided_at: string | null }).decided_at ?? null,
        notes: (d as unknown as { notes: string | null }).notes ?? null,
        decidedByName: profRow?.full_name ?? null,
      }
    }),
  }
})

// ─── getClientWithProjects ────────────────────────────────────────────────────

// cache(): generateMetadata i ClientPage wołają getClientWithProjects dla tego samego ID —
// deduplikuje dwa identyczne zapytania w jednym request.
export const getClientWithProjects = cache(async (clientId: string) => {
  const supabase = await createClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, nip, hubspot_url')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('[getClientWithProjects] client fetch failed:', clientError)
    return { client: null, projects: [] }
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, status, start_date, end_date')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (projectsError || !projects) {
    console.error('[getClientWithProjects] projects fetch failed:', projectsError)
    return { client, projects: [] }
  }

  const projectIds = projects.map((p) => p.id)

  const { data: allTypes, error: typesError } =
    projectIds.length > 0
      ? await supabase
          .from('project_types')
          .select('project_id, type')
          .in('project_id', projectIds)
      : { data: [] as Array<{ project_id: string; type: ImplType }>, error: null }

  if (typesError) {
    console.error('[getClientWithProjects] types fetch failed:', typesError)
  }

  const riskProjectIds =
    projectIds.length > 0 ? await getAtRiskProjectIds(supabase, projectIds) : new Set<string>()

  const typesByProject = new Map<string, ImplType[]>()
  for (const row of allTypes ?? []) {
    const arr = typesByProject.get(row.project_id) ?? []
    arr.push(row.type as ImplType)
    typesByProject.set(row.project_id, arr)
  }

  return {
    client,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      types: typesByProject.get(p.id) ?? [],
      startDate: p.start_date ?? null,
      endDate: p.end_date ?? null,
      atRisk: riskProjectIds.has(p.id),
    })),
  }
})

// ─── getTaskTemplatesForCreation (krok 2 kreatora projektu — D-056) ──────────

export interface TaskTemplateForCreation {
  id: string
  stepTemplateId: string
  phaseNumber: number
  phaseName: string
  stepTitle: string
  taskTitle: string
  kind: TaskKind
  /** Puste = dotyczy wszystkich typów (R15 konwencja). */
  appliesTo: ImplType[]
  est: number | null
  isMilestone: boolean
}

export async function getTaskTemplatesForCreation(): Promise<TaskTemplateForCreation[]> {
  const supabase = await createClient()

  const { data: steps, error: stepsErr } = await supabase
    .from('step_templates')
    .select('id, phase_number, phase_name, step_title, step_order')
    .in('phase_number', [0, 1, 2, 3, 4, 5, 6, 7, 8])
    .eq('is_recurring', false)
    .order('phase_number', { ascending: true })
    .order('step_order', { ascending: true })

  if (stepsErr || !steps || steps.length === 0) {
    console.error('[getTaskTemplatesForCreation] steps fetch failed:', stepsErr)
    return []
  }

  const stepIds = steps.map((s) => s.id)

  const { data: tasks, error: tasksErr } = await supabase
    .from('step_task_templates')
    .select('id, step_template_id, task_title, kind, applies_to_types, est, is_milestone, task_order')
    .in('step_template_id', stepIds)
    .order('task_order', { ascending: true })

  if (tasksErr) {
    console.error('[getTaskTemplatesForCreation] tasks fetch failed:', tasksErr)
    return []
  }

  const stepMap = new Map(steps.map((s) => [s.id, s]))

  return (tasks ?? [])
    .map((t) => {
      const step = stepMap.get(t.step_template_id)
      if (!step) return null
      return {
        id: t.id,
        stepTemplateId: t.step_template_id,
        phaseNumber: step.phase_number,
        phaseName: step.phase_name,
        stepTitle: step.step_title,
        taskTitle: t.task_title,
        kind: t.kind as TaskKind,
        appliesTo: (t.applies_to_types ?? []) as ImplType[],
        est: t.est,
        isMilestone: t.is_milestone,
      }
    })
    .filter((t): t is TaskTemplateForCreation => t !== null && !t.isMilestone)
}

// ─── getProjectsForBrief (Cron P15 — daily brief) ────────────────────────────
// Używa admin client (service_role) — cron nie ma sesji użytkownika.
// Nie korzysta z getAtRiskProjectIds żeby uniknąć niezgodności typów klientów.

export interface BriefAtRiskProject {
  name: string
  clientName: string
}

export interface BriefTask {
  title: string
  projectName: string
  assigneeName: string | null
  dueDate: string
}

export interface BriefData {
  atRiskProjects: BriefAtRiskProject[]
  tasksDueToday: BriefTask[]
  tasksDueSoon: BriefTask[]
}

export async function getProjectsForBrief(): Promise<BriefData> {
  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // Zagrożone projekty: zadanie po terminie lub aktywny projekt po end_date
  const [
    { data: riskTaskRows },
    { data: riskProjectRows },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('project_id')
      .lt('due_date', today)
      .not('status', 'in', '(done,na)'),
    supabase
      .from('projects')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', today),
  ])

  const riskIds = new Set<string>()
  for (const t of riskTaskRows ?? []) riskIds.add(t.project_id)
  for (const p of riskProjectRows ?? []) riskIds.add(p.id)

  // Pobierz dane projektów zagrożonych (name + clientName)
  let atRiskProjects: BriefAtRiskProject[] = []
  if (riskIds.size > 0) {
    const { data: riskProjectData } = await supabase
      .from('projects')
      .select('name, clients(name)')
      .in('id', [...riskIds])
      .order('name', { ascending: true })

    atRiskProjects = (riskProjectData ?? []).map((p) => {
      const clientsField = p.clients
      const clientRow = Array.isArray(clientsField)
        ? (clientsField[0] as { name: string } | undefined) ?? null
        : (clientsField as { name: string } | null)
      return {
        name: p.name,
        clientName: clientRow?.name ?? '',
      }
    })
  }

  // Zadania na dziś (due_date = today, status != done/na)
  const { data: todayTaskRows } = await supabase
    .from('tasks')
    .select('title, assignee_name, due_date, projects(name)')
    .eq('due_date', today)
    .not('status', 'in', '(done,na)')
    .order('title', { ascending: true })

  const tasksDueToday: BriefTask[] = (todayTaskRows ?? []).map((t) => {
    const projectsField = t.projects
    const projectRow = Array.isArray(projectsField)
      ? (projectsField[0] as { name: string } | undefined) ?? null
      : (projectsField as { name: string } | null)
    return {
      title: t.title,
      projectName: projectRow?.name ?? '',
      assigneeName: t.assignee_name ?? null,
      dueDate: t.due_date ?? today,
    }
  })

  // Zadania w ciągu 2 dni (jutro i pojutrze, status != done/na)
  const d1 = new Date()
  d1.setDate(d1.getDate() + 1)
  const d2 = new Date()
  d2.setDate(d2.getDate() + 2)
  const tomorrow = d1.toISOString().slice(0, 10)
  const dayAfter = d2.toISOString().slice(0, 10)

  const { data: soonTaskRows } = await supabase
    .from('tasks')
    .select('title, assignee_name, due_date, projects(name)')
    .gte('due_date', tomorrow)
    .lte('due_date', dayAfter)
    .not('status', 'in', '(done,na)')
    .order('due_date', { ascending: true })

  const tasksDueSoon: BriefTask[] = (soonTaskRows ?? []).map((t) => {
    const projectsField = t.projects
    const projectRow = Array.isArray(projectsField)
      ? (projectsField[0] as { name: string } | undefined) ?? null
      : (projectsField as { name: string } | null)
    return {
      title: t.title,
      projectName: projectRow?.name ?? '',
      assigneeName: t.assignee_name ?? null,
      dueDate: t.due_date ?? tomorrow,
    }
  })

  return { atRiskProjects, tasksDueToday, tasksDueSoon }
}

// ─── RAID / KPI types ─────────────────────────────────────────────────────────

export type RagValue = 'R' | 'A' | 'G'
export type RiskStatus = 'open' | 'monitor' | 'closed'
export type KpiStatus = 'on' | 'at' | 'off' | 'done'

export interface Risk {
  id: string
  description: string
  category: string | null
  phase: string | null
  probability: number | null
  impact: number | null
  score: number | null
  rag: RagValue | null
  owner: string | null
  mitigation: string | null
  status: RiskStatus
  createdAt: string
}

export interface Kpi {
  id: string
  name: string
  target: string | null
  actualValue: string | null
  status: KpiStatus
  notes: string | null
}

// ─── getProjectRisks ──────────────────────────────────────────────────────────

export async function getProjectRisks(projectId: string): Promise<Risk[]> {
  const supabase = await createClient()

  // risks not in generated types yet — cast to any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('risks')
    .select('id, description, category, phase, probability, impact, score, rag, owner, mitigation, status, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getProjectRisks] fetch failed:', error)
    return []
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    description: r.description as string,
    category: (r.category as string | null) ?? null,
    phase: (r.phase as string | null) ?? null,
    probability: (r.probability as number | null) ?? null,
    impact: (r.impact as number | null) ?? null,
    score: (r.score as number | null) ?? null,
    rag: (r.rag as RagValue | null) ?? null,
    owner: (r.owner as string | null) ?? null,
    mitigation: (r.mitigation as string | null) ?? null,
    status: (r.status as RiskStatus) ?? 'open',
    createdAt: r.created_at as string,
  }))
}

// ─── getProjectKpis ───────────────────────────────────────────────────────────

export async function getProjectKpis(projectId: string): Promise<Kpi[]> {
  const supabase = await createClient()

  // kpis not in generated types yet — cast to any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kpis')
    .select('id, name, target, actual_value, status, notes')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getProjectKpis] fetch failed:', error)
    return []
  }

  return (data ?? []).map((k: Record<string, unknown>) => ({
    id: k.id as string,
    name: k.name as string,
    target: (k.target as string | null) ?? null,
    actualValue: (k.actual_value as string | null) ?? null,
    status: (k.status as KpiStatus) ?? 'on',
    notes: (k.notes as string | null) ?? null,
  }))
}
export interface BudgetSettings {
  projectId: string
  rateK: number | null
  rateW: number | null
  rateD: number | null
  bufferPct: number | null
  pmOverheadPct: number | null
  budgetMax: number | null
}

export type RateType = 'K' | 'W' | 'D'

export interface BudgetLine {
  id: string
  projectId: string
  taskId: string | null
  phase: string | null
  rateType: RateType
  estH: number | null
  actualH: number | null
  description: string | null
  createdAt: string
}

// ─── getProjectBudget ─────────────────────────────────────────────────────────

export async function getProjectBudget(
  projectId: string
): Promise<{ settings: BudgetSettings | null; lines: BudgetLine[] }> {
  const supabase = await createClient()

  const [{ data: settingsRaw, error: settingsErr }, { data: linesRaw, error: linesErr }] =
    await Promise.all([
      supabase
        .from('budget_settings')
        .select('project_id, rate_k, rate_w, rate_d, buffer_pct, pm_overhead_pct, budget_max')
        .eq('project_id', projectId)
        .single(),
      supabase
        .from('budget_lines')
        .select('id, project_id, task_id, phase, rate_type, est_h, actual_h, description, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),
    ])

  if (settingsErr && settingsErr.code !== 'PGRST116') {
    console.error('[getProjectBudget] settings:', settingsErr)
  }
  if (linesErr) {
    console.error('[getProjectBudget] lines:', linesErr)
  }

  const settings: BudgetSettings | null = settingsRaw
    ? {
        projectId: settingsRaw.project_id,
        rateK: settingsRaw.rate_k,
        rateW: settingsRaw.rate_w,
        rateD: settingsRaw.rate_d,
        bufferPct: settingsRaw.buffer_pct,
        pmOverheadPct: settingsRaw.pm_overhead_pct,
        budgetMax: settingsRaw.budget_max,
      }
    : null

  const lines: BudgetLine[] = (linesRaw ?? []).map((l) => ({
    id: l.id,
    projectId: l.project_id,
    taskId: l.task_id ?? null,
    phase: l.phase ?? null,
    rateType: l.rate_type as RateType,
    estH: l.est_h ?? null,
    actualH: l.actual_h ?? null,
    description: l.description ?? null,
    createdAt: l.created_at,
  }))

  return { settings, lines }
}

// ─── Change Request types ──────────────────────────────────────────────────────

export type CrType = 'scope' | 'timeline' | 'budget' | 'arch' | 'resource' | 'other'
export type CrImpact = 'low' | 'medium' | 'high'
export type CrStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'implemented'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ChangeRequest {
  id: string
  projectId: string
  crNumber: string | null
  title: string
  description: string | null
  currentState: string | null
  desiredState: string | null
  businessRationale: string | null
  crType: CrType
  impactLevel: CrImpact | null
  impactHours: number | null
  impactCost: number | null
  scheduleImpact: string | null
  submittedDate: string | null
  status: CrStatus
  bwApproval: ApprovalStatus | null
  bwApprovalDate: string | null
  clientApproval: ApprovalStatus | null
  clientApprovalDate: string | null
  clientApprover: string | null
  implementationPlan: string | null
  notes: string | null
  createdAt: string
}

// ─── getProjectChangeRequests ────────────────────────────────────────────────

export async function getProjectChangeRequests(
  projectId: string
): Promise<ChangeRequest[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('change_requests')
    .select(
      'id, project_id, cr_number, title, description, current_state, desired_state, business_rationale, cr_type, impact_level, impact_hours, impact_cost, schedule_impact, submitted_date, status, bw_approval, bw_approval_date, client_approval, client_approval_date, client_approver, implementation_plan, notes, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getProjectChangeRequests]:', error)
    return []
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    projectId: r.project_id,
    crNumber: r.cr_number ?? null,
    title: r.title,
    description: r.description ?? null,
    currentState: r.current_state ?? null,
    desiredState: r.desired_state ?? null,
    businessRationale: r.business_rationale ?? null,
    crType: r.cr_type as CrType,
    impactLevel: (r.impact_level ?? null) as CrImpact | null,
    impactHours: r.impact_hours ?? null,
    impactCost: r.impact_cost ?? null,
    scheduleImpact: r.schedule_impact ?? null,
    submittedDate: r.submitted_date ?? null,
    status: r.status as CrStatus,
    bwApproval: (r.bw_approval ?? null) as ApprovalStatus | null,
    bwApprovalDate: r.bw_approval_date ?? null,
    clientApproval: (r.client_approval ?? null) as ApprovalStatus | null,
    clientApprovalDate: r.client_approval_date ?? null,
    clientApprover: r.client_approver ?? null,
    implementationPlan: r.implementation_plan ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  }))
}

// ─── RACI types ───────────────────────────────────────────────────────────────

export type RaciValue = 'R' | 'A' | 'C' | 'I'

export interface RaciAssignment {
  id: string
  taskId: string
  role: string
  raci: RaciValue
}

export interface RaciTask {
  taskId: string
  taskTitle: string
  phaseNumber: number
  phaseName: string
  stepTitle: string
  taskOrder: number
  assignments: RaciAssignment[]
}

// ─── getProjectRaci ───────────────────────────────────────────────────────────

export async function getProjectRaci(projectId: string): Promise<RaciTask[]> {
  const supabase = await createClient()

  const { data: taskRows, error: tasksErr } = await supabase
    .from('tasks')
    .select(
      'id, title, task_order, step_id, project_steps(phase_number, phase_name, step_title)'
    )
    .eq('project_id', projectId)
    .eq('hidden', false)
    .order('task_order', { ascending: true })

  if (tasksErr) {
    console.error('[getProjectRaci] tasks:', tasksErr)
    return []
  }

  const taskIds = (taskRows ?? []).map((t) => t.id)
  if (taskIds.length === 0) return []

  const { data: assignmentRows, error: assignErr } = await supabase
    .from('task_role_assignments')
    .select('id, task_id, role, raci')
    .in('task_id', taskIds)

  if (assignErr) {
    console.error('[getProjectRaci] assignments:', assignErr)
  }

  const assignmentsByTask = new Map<string, RaciAssignment[]>()
  for (const a of assignmentRows ?? []) {
    const arr = assignmentsByTask.get(a.task_id) ?? []
    arr.push({ id: a.id, taskId: a.task_id, role: a.role, raci: a.raci as RaciValue })
    assignmentsByTask.set(a.task_id, arr)
  }

  return (taskRows ?? []).map((t) => {
    const stepField = Array.isArray(t.project_steps) ? t.project_steps[0] : t.project_steps
    const step = stepField as { phase_number: number; phase_name: string; step_title: string } | null
    return {
      taskId: t.id,
      taskTitle: t.title,
      phaseNumber: step?.phase_number ?? 0,
      phaseName: step?.phase_name ?? '',
      stepTitle: step?.step_title ?? '',
      taskOrder: t.task_order,
      assignments: assignmentsByTask.get(t.id) ?? [],
    }
  })
}

// ─── ProjectHealthMetrics ─────────────────────────────────────────────────────

export interface ProjectHealthMetrics {
  risksRed: number       // ryzyka RAG='R' z status != 'closed'
  crPending: number      // CR z status='pending'
  burnRate: number | null // (sum actual_h / sum est_h) * 100, null gdy brak danych
}

export async function getProjectHealthMetrics(projectId: string): Promise<ProjectHealthMetrics> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [risksResult, crResult, budgetResult] = await Promise.all([
    (supabase as any)
      .from('risks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('rag', 'R')
      .neq('status', 'closed'),
    (supabase as any)
      .from('change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'pending'),
    (supabase as any)
      .from('budget_lines')
      .select('est_h, actual_h')
      .eq('project_id', projectId),
  ])

  const risksRed = (risksResult.count as number) ?? 0
  const crPending = (crResult.count as number) ?? 0

  let burnRate: number | null = null
  const lines = (budgetResult.data as Array<{ est_h: number; actual_h: number }> | null) ?? []
  const totalEst = lines.reduce((s, l) => s + (l.est_h ?? 0), 0)
  const totalActual = lines.reduce((s, l) => s + (l.actual_h ?? 0), 0)
  if (totalEst > 0) burnRate = Math.round((totalActual / totalEst) * 100)

  return { risksRed, crPending, burnRate }
}

