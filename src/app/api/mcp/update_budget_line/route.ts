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

  const { line_id, actual_h } = body

  if (typeof line_id !== 'string' || !line_id.trim()) {
    return NextResponse.json({ ok: false, error: 'line_id jest wymagany.' }, { status: 400 })
  }
  if (typeof actual_h !== 'number' || actual_h < 0) {
    return NextResponse.json({ ok: false, error: 'actual_h musi byc liczba >= 0.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: budget_lines not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('budget_lines')
    .update({ actual_h })
    .eq('id', line_id)
    .select('id, project_id')
    .single()

  if (error) {
    console.error('[mcp/update_budget_line] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const row = data as { id: string; project_id: string }

  try {
    await supabase.from('activity_log').insert({
      entity: 'budget_line',
      entity_id: row.id,
      action: 'update_budget_line',
      actor_id: user.userId,
      before: null,
      after: { actual_h },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id } })
}
