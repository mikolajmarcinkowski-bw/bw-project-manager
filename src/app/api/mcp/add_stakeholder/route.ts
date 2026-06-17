import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_CATEGORY = ['kp', 'ks', 'ki', 'mo'] as const

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

  const { project_id, name, category, role, interest, expectations } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'name jest wymagany.' }, { status: 400 })
  }
  if (!VALID_CATEGORY.includes(category as (typeof VALID_CATEGORY)[number])) {
    return NextResponse.json({
      ok: false,
      error: `category musi byc jednym z: ${VALID_CATEGORY.join(', ')}.`,
    }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: stakeholders not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('stakeholders')
    .insert({
      project_id,
      name: (name as string).trim(),
      category,
      role: typeof role === 'string' ? role.trim() || null : null,
      interest: typeof interest === 'string' ? interest.trim() || null : null,
      expectations: typeof expectations === 'string' ? expectations.trim() || null : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_stakeholder] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const stakeholderId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_stakeholder',
      actor_id: user.userId,
      before: null,
      after: { stakeholder_id: stakeholderId, name, category },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: stakeholderId } }, { status: 201 })
}
