// Read-only data layer — widok konsultanta P23.
// Używa admin client (service_role) — spójnie z getAllSpecialistsWithAllocation.

import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ConsultantTaskItem {
  id: string
  title: string
  status: string
  dueDate: string | null
  phaseNumber: number
  phaseName: string
}

export interface ConsultantProject {
  id: string
  name: string
  clientName: string
  status: string
  tasks: ConsultantTaskItem[]
}

export interface ConsultantDetail {
  id: string
  fullName: string
  role: string | null
  isActive: boolean
  // Statystyki — zadania ze statusem != done/na
  taskCount: number
  // Liczba unikalnych projektów z co najmniej 1 aktywnym zadaniem
  projectCount: number
  // Wszystkie zadania pogrupowane per projekt (aktywne projekty, hidden=false)
  projects: ConsultantProject[]
}

// cache(): generateMetadata i page wywołują funkcję dla tego samego ID w jednym request.
export const getConsultantDetail = cache(async (memberId: string): Promise<ConsultantDetail | null> => {
  const supabase = createAdminClient()

  // 1. Pobierz team_member
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id, full_name, role, is_active')
    .eq('id', memberId)
    .single()

  if (memberError || !member) {
    console.error('[getConsultantDetail] member fetch failed:', memberError)
    return null
  }

  // 2. Pobierz wszystkie nieukryte zadania przypisane do konsultanta (ILIKE = case-insensitive)
  //    z joinem do project_steps (phase_number, phase_name) i projects(id, name, status, clients(name))
  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select(
      'id, title, status, due_date, project_id, step_id, project_steps(phase_number, phase_name), projects(id, name, status, clients(name))'
    )
    .ilike('assignee_name', member.full_name)
    .eq('hidden', false)

  if (tasksError) {
    console.error('[getConsultantDetail] tasks fetch failed:', tasksError)
    return {
      id: member.id,
      fullName: member.full_name,
      role: member.role ?? null,
      isActive: member.is_active,
      taskCount: 0,
      projectCount: 0,
      projects: [],
    }
  }

  // 3. Normalizuj osadzone relacje i filtruj do aktywnych projektów
  type ProjectEmbed = {
    id: string
    name: string
    status: string
    clients: { name: string } | { name: string }[] | null
  }

  type StepEmbed = {
    phase_number: number
    phase_name: string
  }

  interface NormalizedTask {
    id: string
    title: string
    status: string
    dueDate: string | null
    phaseNumber: number
    phaseName: string
    projectId: string
    projectName: string
    projectStatus: string
    clientName: string
  }

  const normalized: NormalizedTask[] = []

  for (const t of taskRows ?? []) {
    // Normalizuj project embed
    const projectsField = (t as unknown as { projects: ProjectEmbed | ProjectEmbed[] | null }).projects
    const projectRow = Array.isArray(projectsField)
      ? (projectsField[0] as ProjectEmbed | undefined) ?? null
      : (projectsField as ProjectEmbed | null)

    if (!projectRow || projectRow.status !== 'active') continue

    // Normalizuj clients embed (zagnieżdżony w projects)
    const clientsField = projectRow.clients
    const clientRow = Array.isArray(clientsField)
      ? (clientsField[0] as { name: string } | undefined) ?? null
      : (clientsField as { name: string } | null)

    // Normalizuj project_steps embed
    const stepsField = (t as unknown as { project_steps: StepEmbed | StepEmbed[] | null }).project_steps
    const stepRow = Array.isArray(stepsField)
      ? (stepsField[0] as StepEmbed | undefined) ?? null
      : (stepsField as StepEmbed | null)

    normalized.push({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: (t as unknown as { due_date: string | null }).due_date ?? null,
      phaseNumber: stepRow?.phase_number ?? 0,
      phaseName: stepRow?.phase_name ?? '',
      projectId: projectRow.id,
      projectName: projectRow.name,
      projectStatus: projectRow.status,
      clientName: clientRow?.name ?? '',
    })
  }

  // 4. Grupuj zadania per projekt
  const projectMap = new Map<string, ConsultantProject>()

  for (const t of normalized) {
    if (!projectMap.has(t.projectId)) {
      projectMap.set(t.projectId, {
        id: t.projectId,
        name: t.projectName,
        clientName: t.clientName,
        status: t.projectStatus,
        tasks: [],
      })
    }
    projectMap.get(t.projectId)!.tasks.push({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate,
      phaseNumber: t.phaseNumber,
      phaseName: t.phaseName,
    })
  }

  const projects = Array.from(projectMap.values())

  // 5. Statystyki — zadania ze statusem != done/na
  const activeTasks = normalized.filter((t) => t.status !== 'done' && t.status !== 'na')
  const taskCount = activeTasks.length
  const projectCount = new Set(activeTasks.map((t) => t.projectId)).size

  return {
    id: member.id,
    fullName: member.full_name,
    role: member.role ?? null,
    isActive: member.is_active,
    taskCount,
    projectCount,
    projects,
  }
})
