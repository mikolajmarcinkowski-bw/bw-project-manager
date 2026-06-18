import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  // Body is optional — client may send empty body or omit it entirely
  const body = await request.json().catch(() => ({})) as {
    client_id?: string
    status?: string
    pm_id?: string
  }

  try {
    const supabase = createAdminClient()

    let projectsQuery = supabase
      .from('projects')
      .select('id, name, client_id, status, start_date, end_date, clients(name)')

    if (body.status) {
      projectsQuery = projectsQuery.eq('status', body.status)
    }
    if (body.client_id) {
      projectsQuery = projectsQuery.eq('client_id', body.client_id)
    }

    const { data: projectsRaw, error: projectsError } = await projectsQuery.order('created_at', {
      ascending: false,
    })

    if (projectsError) {
      console.error('[mcp/get_projects] projects fetch failed:', projectsError)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const { data: allTypes } = await supabase
      .from('project_types')
      .select('project_id, type')

    let pmProjectIds: Set<string> | null = null
    if (body.pm_id) {
      const { data: pmRows, error: pmError } = await supabase
        .from('project_pms')
        .select('project_id')
        .eq('profile_id', body.pm_id)

      if (pmError) {
        console.error('[mcp/get_projects] project_pms fetch failed:', pmError)
      }
      pmProjectIds = new Set((pmRows ?? []).map((r) => r.project_id))
    }

    const today = new Date().toISOString().slice(0, 10)
    const projectIds = (projectsRaw ?? []).map((p) => p.id)

    const riskIds = new Set<string>()
    if (projectIds.length > 0) {
      const { data: riskTasks } = await supabase
        .from('tasks')
        .select('project_id')
        .in('project_id', projectIds)
        .lt('due_date', today)
        .not('status', 'in', '(done,na)')

      const { data: riskProjects } = await supabase
        .from('projects')
        .select('id')
        .in('id', projectIds)
        .eq('status', 'active')
        .lt('end_date', today)

      for (const t of riskTasks ?? []) riskIds.add(t.project_id)
      for (const p of riskProjects ?? []) riskIds.add(p.id)
    }

    const typesByProject = new Map<string, string[]>()
    for (const row of allTypes ?? []) {
      const arr = typesByProject.get(row.project_id) ?? []
      arr.push(row.type)
      typesByProject.set(row.project_id, arr)
    }

    const data = (projectsRaw ?? [])
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
          atRisk: riskIds.has(p.id),
        }
      })
      .filter((p) => {
        if (pmProjectIds !== null && !pmProjectIds.has(p.id)) return false
        return true
      })

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_projects] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
