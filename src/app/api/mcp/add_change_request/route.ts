import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_CR_TYPE = ['scope', 'timeline', 'budget', 'arch', 'resource', 'other'] as const
const VALID_IMPACT = ['low', 'medium', 'high', 'critical'] as const

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

  const { project_id, title, cr_type, impact_level, estimated_hours, estimated_cost, description } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ ok: false, error: 'title jest wymagany.' }, { status: 400 })
  }
  if (cr_type !== undefined && !VALID_CR_TYPE.includes(cr_type as (typeof VALID_CR_TYPE)[number])) {
    return NextResponse.json({
      ok: false,
      error: `cr_type musi byc jednym z: ${VALID_CR_TYPE.join(', ')}.`,
    }, { status: 400 })
  }
  if (impact_level !== undefined && !VALID_IMPACT.includes(impact_level as (typeof VALID_IMPACT)[number])) {
    return NextResponse.json({
      ok: false,
      error: `impact_level musi byc jednym z: ${VALID_IMPACT.join(', ')}.`,
    }, { status: 400 })
  }
  if (estimated_hours !== undefined && (typeof estimated_hours !== 'number' || estimated_hours < 0)) {
    return NextResponse.json({ ok: false, error: 'estimated_hours musi byc liczba >= 0.' }, { status: 400 })
  }
  if (estimated_cost !== undefined && (typeof estimated_cost !== 'number' || estimated_cost < 0)) {
    return NextResponse.json({ ok: false, error: 'estimated_cost musi byc liczba >= 0.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: change_requests not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('change_requests')
    .insert({
      project_id,
      title: (title as string).trim(),
      cr_type: cr_type ?? 'other',
      impact_level: impact_level ?? null,
      impact_hours: typeof estimated_hours === 'number' ? estimated_hours : null,
      impact_cost: typeof estimated_cost === 'number' ? estimated_cost : null,
      description: typeof description === 'string' ? description.trim() || null : null,
      status: 'draft',
      bw_approval: 'pending',
      submitted_by: user.userId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_change_request] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const crId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_change_request',
      actor_id: user.userId,
      before: null,
      after: { cr_id: crId, title, cr_type, impact_level },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({
    ok: true,
    data: {
      id: crId,
      status: 'draft',
      title: (title as string).trim(),
      cr_type: cr_type ?? 'other',
      note: "Status 'draft' — zmień na 'pending' przez update_change_request gdy gotowe do zatwierdzenia.",
    },
  }, { status: 201 })
}
