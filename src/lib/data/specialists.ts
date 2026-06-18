import { createAdminClient } from '@/lib/supabase/admin'

export interface Specialist {
  id: string
  full_name: string
}

export interface SpecialistWithAllocation {
  id: string
  full_name: string
  is_active: boolean
  active_tasks: number
  active_projects: number
}

export async function getSpecialists(): Promise<Specialist[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('team_members')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error || !data) {
    console.error('[getSpecialists] fetch failed:', error)
    return []
  }

  return data.filter((m): m is Specialist => Boolean(m.full_name))
}

export async function getAllSpecialistsWithAllocation(): Promise<SpecialistWithAllocation[]> {
  const supabase = createAdminClient()

  const [
    { data: members, error: membersError },
    { data: activeTasks },
    { data: steps },
    { data: activeProjects },
  ] = await Promise.all([
    supabase.from('team_members').select('id, full_name, is_active').order('full_name'),
    supabase
      .from('tasks')
      .select('assignee_name, step_id')
      .neq('status', 'done')
      .neq('status', 'na')
      .not('assignee_name', 'is', null),
    supabase.from('project_steps').select('id, project_id'),
    supabase.from('projects').select('id').eq('status', 'active'),
  ])

  if (membersError || !members) {
    console.error('[getAllSpecialistsWithAllocation] fetch failed:', membersError)
    return []
  }

  const stepToProject = new Map<string, string>(
    (steps ?? []).map((s) => [s.id, s.project_id])
  )
  const activeProjectIds = new Set((activeProjects ?? []).map((p) => p.id))

  const assigneeTaskCount = new Map<string, number>()
  const assigneeProjectIds = new Map<string, Set<string>>()

  for (const task of activeTasks ?? []) {
    if (!task.assignee_name || !task.step_id) continue
    const name = task.assignee_name

    assigneeTaskCount.set(name, (assigneeTaskCount.get(name) ?? 0) + 1)

    if (!assigneeProjectIds.has(name)) {
      assigneeProjectIds.set(name, new Set())
    }

    const projectId = stepToProject.get(task.step_id)
    if (projectId && activeProjectIds.has(projectId)) {
      assigneeProjectIds.get(name)!.add(projectId)
    }
  }

  return members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    is_active: m.is_active,
    active_tasks: assigneeTaskCount.get(m.full_name) ?? 0,
    active_projects: assigneeProjectIds.get(m.full_name)?.size ?? 0,
  }))
}
