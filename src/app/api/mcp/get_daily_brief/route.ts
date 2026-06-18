import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const daysAhead = typeof body.days_ahead === 'number' ? Math.min(body.days_ahead, 30) : 7

  const today = new Date().toISOString().slice(0, 10)
  const future = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10)

  const supabase = createAdminClient()

  // Aktywne projekty
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, clients(name)')
    .eq('status', 'active')

  const projectIds = (projects ?? []).map((p: any) => p.id)
  if (projectIds.length === 0) {
    return NextResponse.json({ ok: true, data: { overdue: [], due_soon: [], project_count: 0 } })
  }

  // Przeterminowane
  const { data: overdue } = await supabase
    .from('tasks')
    .select('id, title, due_date, assignee_name, project_id, status')
    .in('project_id', projectIds)
    .not('status', 'in', '(done,na)')
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .eq('hidden', false)
    .order('due_date', { ascending: true })
    .limit(50)

  // Nadchodzące
  const { data: due_soon } = await supabase
    .from('tasks')
    .select('id, title, due_date, assignee_name, project_id, status')
    .in('project_id', projectIds)
    .not('status', 'in', '(done,na)')
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .lte('due_date', future)
    .eq('hidden', false)
    .order('due_date', { ascending: true })
    .limit(50)

  // Dodaj nazwy projektów
  const projectMap = Object.fromEntries(
    (projects ?? []).map((p: any) => [p.id, { name: p.name, client: (p.clients as any)?.name }])
  )

  const enrich = (tasks: any[]) =>
    (tasks ?? []).map((t) => ({
      ...t,
      project_name: projectMap[t.project_id]?.name,
      client_name: projectMap[t.project_id]?.client,
    }))

  return NextResponse.json({
    ok: true,
    data: {
      overdue: enrich(overdue ?? []),
      due_soon: enrich(due_soon ?? []),
      project_count: projectIds.length,
      today,
      days_ahead: daysAhead,
    },
  })
}
