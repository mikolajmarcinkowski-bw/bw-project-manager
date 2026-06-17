// Read-only data layer for server components.
// No 'use server' directive — this is not a Server Actions file.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
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
  /** Typy wdrożenia zadania (CRM/SPO/INT/MKT/ERP) — kolumna „Typ" w Gantcie. */
  types: ImplType[]
  /** Termin zadania (do alertów „po terminie"). */
  dueDate: string | null
  /** Data faktycznego ukończenia (P8 — auto-ustawiana gdy status → done). */
  completionDate: string | null
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
  decisions: { id: string; type: DecisionType; status: DecisionStatus; title: string; stepId: string | null }[]
}

// cache(): trasa woła getProjectDetail dwa razy (generateMetadata + page) —
// React cache dedupuje w obrębie jednego requestu.
export const getProjectDetail = cache(async (projectId: string): Promise<ProjectDetail | null> => {
  const supabase = await createClient()

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, name, status, start_date, end_date, client_id, clients(id, name)')
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
      .select('id, step_id, title, status, kind, est, w_start, w_end, assignee_name, is_milestone, type, due_date, completion_date, task_order')
      .eq('project_id', projectId)
      .eq('hidden', false)
      .order('task_order', { ascending: true }),
    supabase.from('milestones').select('id, ms_code, name, week, status').eq('project_id', projectId),
    supabase.from('decision_points').select('id, type, status, title, step_id').eq('project_id', projectId),
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
      types: (t.type ?? []) as ImplType[],
      dueDate: t.due_date ?? null,
      completionDate: t.completion_date ?? null,
    })
    tasksByStep.set(t.step_id, arr)
  }

  const steps: GanttStep[] = (stepsRows ?? []).map((s) => {
    const tasks = tasksByStep.get(s.id) ?? []
    // Fallback na drugi bound gdy zadanie ma tylko jeden (chroni przed znikaniem paska)
    const starts = tasks.map((t) => t.wStart ?? t.wEnd).filter((w): w is number => w != null)
    const ends = tasks.map((t) => t.wEnd ?? t.wStart).filter((w): w is number => w != null)
    return {
      id: s.id,
      phaseNumber: s.phase_number,
      phaseName: s.phase_name,
      stepTitle: s.step_title,
      status: s.status as StepStatus,
      isActive: s.is_active,
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
    decisions: (decRows ?? []).map((d) => ({
      id: d.id,
      type: d.type as DecisionType,
      status: d.status as DecisionStatus,
      title: d.title,
      stepId: d.step_id,
    })),
  }
})

// ─── getClientWithProjects ────────────────────────────────────────────────────

export async function getClientWithProjects(clientId: string): Promise<{
  client: { id: string; name: string; nip: string | null; hubspot_url: string | null } | null
  projects: Array<{
    id: string
    name: string
    status: string
    types: ImplType[]
    startDate: string | null
    endDate: string | null
    atRisk: boolean
  }>
}> {
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
}
