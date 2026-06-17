import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const supabase = createAdminClient()
  // api_tokens table managed by MCP auth layer — cast needed until types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('api_tokens')
    .select('user_id')
    .eq('token', token)
    .is('revoked_at', null)
    .single()
  return (data as { user_id: string } | null)?.user_id ?? null
}

export async function POST(request: NextRequest) {
  const userId = await verifyToken(request.headers.get('authorization'))
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .order('name', { ascending: true })

    if (clientsError) {
      console.error('[mcp/get_clients] clients fetch failed:', clientsError)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, client_id, status')

    if (projectsError) {
      console.error('[mcp/get_clients] projects fetch failed:', projectsError)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const today = new Date().toISOString().slice(0, 10)

    const { data: riskTasks } = await supabase
      .from('tasks')
      .select('project_id')
      .lt('due_date', today)
      .not('status', 'in', '(done,na)')

    const { data: riskProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', today)

    const riskIds = new Set<string>()
    for (const t of riskTasks ?? []) riskIds.add(t.project_id)
    for (const p of riskProjects ?? []) riskIds.add(p.id)

    const projectsByClient = new Map<string, typeof projects>()
    for (const p of projects ?? []) {
      const arr = projectsByClient.get(p.client_id) ?? []
      arr.push(p)
      projectsByClient.set(p.client_id, arr)
    }

    const data = (clients ?? [])
      .map((c) => {
        const clientProjects = projectsByClient.get(c.id) ?? []
        const activeCount = clientProjects.filter((p) => p.status === 'active').length
        const atRisk = clientProjects.some((p) => riskIds.has(p.id))
        return {
          id: c.id,
          name: c.name,
          projectCount: clientProjects.length,
          activeCount,
          atRisk,
        }
      })
      .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || a.name.localeCompare(b.name, 'pl'))

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_clients] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
