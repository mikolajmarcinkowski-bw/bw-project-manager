import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_RAG = ['R', 'A', 'G'] as const

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

  const { project_id, description, category, phase, probability, impact, rag, owner, mitigation } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ ok: false, error: 'description jest wymagany.' }, { status: 400 })
  }
  if (typeof probability !== 'number' || probability < 1 || probability > 5 || !Number.isInteger(probability)) {
    return NextResponse.json({ ok: false, error: 'probability musi byc liczba calkowita 1-5.' }, { status: 400 })
  }
  if (typeof impact !== 'number' || impact < 1 || impact > 5 || !Number.isInteger(impact)) {
    return NextResponse.json({ ok: false, error: 'impact musi byc liczba calkowita 1-5.' }, { status: 400 })
  }
  if (!VALID_RAG.includes(rag as (typeof VALID_RAG)[number])) {
    return NextResponse.json({ ok: false, error: "rag musi byc 'R', 'A' lub 'G'." }, { status: 400 })
  }
  if (typeof owner !== 'string' || !owner.trim()) {
    return NextResponse.json({ ok: false, error: 'owner jest wymagany.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: risks not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('risks')
    .insert({
      project_id,
      description: (description as string).trim(),
      category: typeof category === 'string' ? category.trim() || null : null,
      phase: typeof phase === 'string' ? phase.trim() || null : null,
      probability,
      impact,
      // score is a generated column — do not insert
      rag,
      owner: (owner as string).trim(),
      mitigation: typeof mitigation === 'string' ? mitigation.trim() || null : null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_risk] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const riskId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_risk',
      actor_id: user.userId,
      before: null,
      after: { risk_id: riskId, description, rag, owner, probability, impact },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: riskId } }, { status: 201 })
}
