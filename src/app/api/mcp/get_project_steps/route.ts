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

  const { project_id, phase } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: project_steps not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('project_steps')
    .select('id, phase_number, phase_name, step_title, status, is_active, is_parallel, is_recurring, is_decision, step_order')
    .eq('project_id', project_id)
    .order('phase_number', { ascending: true })
    .order('step_order', { ascending: true })

  if (typeof phase === 'number') {
    query = query.eq('phase_number', phase)
  }

  const { data, error } = await query

  if (error) {
    console.error('[mcp/get_project_steps] fetch failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const steps = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    phase_number: row.phase_number,
    phase_name: row.phase_name,
    step_title: row.step_title,
    status: row.status,
    is_active: row.is_active ?? false,
    is_parallel: row.is_parallel ?? false,
    is_recurring: row.is_recurring ?? false,
    is_decision: row.is_decision ?? false,
    step_order: row.step_order,
  }))

  return NextResponse.json({ ok: true, data: steps })
}
