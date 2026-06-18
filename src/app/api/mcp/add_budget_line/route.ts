import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_RATE_TYPE = ['K', 'W', 'D'] as const

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

  const { project_id, task_id, phase, rate_type, est_h, description } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof phase !== 'string' || !phase.trim()) {
    return NextResponse.json({ ok: false, error: 'phase jest wymagany.' }, { status: 400 })
  }
  if (!VALID_RATE_TYPE.includes(rate_type as (typeof VALID_RATE_TYPE)[number])) {
    return NextResponse.json({
      ok: false,
      error: `rate_type musi byc jednym z: ${VALID_RATE_TYPE.join(', ')}.`,
    }, { status: 400 })
  }
  if (typeof est_h !== 'number' || est_h < 0) {
    return NextResponse.json({ ok: false, error: 'est_h musi byc liczba >= 0.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Walidacja task_id — jeśli podany, musi należeć do tego projektu
  if (typeof task_id === 'string' && task_id.trim()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: taskRow, error: taskErr } = await (supabase as any)
      .from('tasks')
      .select('id, project_id')
      .eq('id', task_id.trim())
      .maybeSingle()
    if (taskErr) {
      console.error('[mcp/add_budget_line] task fetch failed:', taskErr)
      return NextResponse.json({ ok: false, error: taskErr.message }, { status: 500 })
    }
    if (!taskRow || (taskRow as any).project_id !== project_id) {
      return NextResponse.json({ ok: false, error: 'task_id nie należy do tego projektu.' }, { status: 400 })
    }
  }

  // TODO: budget_lines not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('budget_lines')
    .insert({
      project_id,
      task_id: typeof task_id === 'string' && task_id.trim() ? task_id.trim() : null,
      phase: (phase as string).trim(),
      rate_type,
      est_h,
      actual_h: 0,
      description: typeof description === 'string' ? description.trim() || null : null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_budget_line] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const lineId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_budget_line',
      actor_id: user.userId,
      before: null,
      after: { line_id: lineId, phase, rate_type, est_h },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: lineId } }, { status: 201 })
}
