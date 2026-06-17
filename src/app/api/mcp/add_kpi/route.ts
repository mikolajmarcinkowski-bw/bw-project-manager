import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_STATUS = ['on', 'at', 'off', 'done'] as const

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

  const { project_id, name, target, status, notes } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'name jest wymagany.' }, { status: 400 })
  }
  if (status !== undefined && !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({
      ok: false,
      error: `status musi byc jednym z: ${VALID_STATUS.join(', ')}.`,
    }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: kpis not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kpis')
    .insert({
      project_id,
      name: (name as string).trim(),
      target: typeof target === 'string' ? target.trim() || null : null,
      status: (status as string) ?? 'on',
      notes: typeof notes === 'string' ? notes.trim() || null : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_kpi] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const kpiId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_kpi',
      actor_id: user.userId,
      before: null,
      after: { kpi_id: kpiId, name, target, status },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: kpiId } }, { status: 201 })
}
