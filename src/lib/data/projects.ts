// Read-only data layer for server components.
// No 'use server' directive — this is not a Server Actions file.

import { createClient } from '@/lib/supabase/server'
import type { ImplType } from '@/lib/actions/projects'

// Re-export for consumers who only import from this module
export type { ImplType }

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

  // At-risk: due_date < today AND status not in ('done','na')
  const today = new Date().toISOString().slice(0, 10)
  const { data: riskTasks, error: riskError } = await supabase
    .from('tasks')
    .select('project_id')
    .lt('due_date', today)
    .not('status', 'in', '("done","na")')

  if (riskError) {
    console.error('[getClientsWithStats] risk tasks fetch failed:', riskError)
  }

  const riskProjectIds = new Set((riskTasks ?? []).map((t) => t.project_id))

  const projectsByClient = new Map<string, typeof projects>()
  for (const p of projects) {
    const arr = projectsByClient.get(p.client_id) ?? []
    arr.push(p)
    projectsByClient.set(p.client_id, arr)
  }

  return clients.map((c) => {
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

  const today = new Date().toISOString().slice(0, 10)
  const { data: riskTasks, error: riskError } = await supabase
    .from('tasks')
    .select('project_id')
    .lt('due_date', today)
    .not('status', 'in', '("done","na")')

  if (riskError) {
    console.error('[getAllProjects] risk tasks fetch failed:', riskError)
  }

  const riskProjectIds = new Set((riskTasks ?? []).map((t) => t.project_id))

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

  const today = new Date().toISOString().slice(0, 10)
  const { data: riskTasks, error: riskError } =
    projectIds.length > 0
      ? await supabase
          .from('tasks')
          .select('project_id')
          .in('project_id', projectIds)
          .lt('due_date', today)
          .not('status', 'in', '("done","na")')
      : { data: [] as Array<{ project_id: string }>, error: null }

  if (riskError) {
    console.error('[getClientWithProjects] risk tasks fetch failed:', riskError)
  }

  const riskProjectIds = new Set((riskTasks ?? []).map((t) => t.project_id))

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
