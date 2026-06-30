import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { client_id?: string }

  if (!body.client_id) {
    return NextResponse.json({ ok: false, error: 'client_id jest wymagany.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, hubspot_url, created_at')
      .eq('id', body.client_id)
      .single()

    if (error?.code === 'PGRST116' || !client) {
      return NextResponse.json({ ok: false, error: 'Klient nie znaleziony.' }, { status: 404 })
    }
    if (error) return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })

    // Pobierz projekty klienta z atRisk
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, start_date, end_date')
      .eq('client_id', body.client_id)
      .order('created_at', { ascending: false })

    const projectIds = (projects ?? []).map(p => p.id)
    const today = new Date().toISOString().slice(0, 10)

    // atRisk: projekty z overdue tasks
    const { data: riskTaskRows } = projectIds.length > 0 ? await supabase
      .from('tasks')
      .select('project_id')
      .in('project_id', projectIds)
      .lt('due_date', today)
      .not('status', 'in', '(done,na)') : { data: [] }

    const riskIds = new Set((riskTaskRows ?? []).map(r => r.project_id))

    // Typy projektów
    const { data: typeRows } = projectIds.length > 0 ? await supabase
      .from('project_types')
      .select('project_id, type')
      .in('project_id', projectIds) : { data: [] }

    const typeMap = new Map<string, string[]>()
    for (const tr of typeRows ?? []) {
      const arr = typeMap.get(tr.project_id) ?? []
      arr.push(tr.type)
      typeMap.set(tr.project_id, arr)
    }

    const projectList = (projects ?? []).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.start_date ?? null,
      endDate: p.end_date ?? null,
      types: typeMap.get(p.id) ?? [],
      atRisk: riskIds.has(p.id),
    }))

    return NextResponse.json({
      ok: true,
      data: {
        id: client.id,
        name: client.name,
        hubspotUrl: (client as Record<string, unknown>).hubspot_url ?? null,
        createdAt: client.created_at,
        projectCount: projectList.length,
        activeCount: projectList.filter(p => p.status === 'active').length,
        projects: projectList,
      },
    })
  } catch (err) {
    console.error('[mcp/get_client_detail] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
