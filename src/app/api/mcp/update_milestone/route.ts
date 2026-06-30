import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_STATUS = ['on', 'at', 'off', 'done'] as const
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

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

  const { milestone_id, target_date, status, name } = body

  if (typeof milestone_id !== 'string' || !milestone_id.trim()) {
    return NextResponse.json({ ok: false, error: 'milestone_id jest wymagany.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (target_date !== undefined) {
    if (typeof target_date !== 'string' || !DATE_REGEX.test(target_date)) {
      return NextResponse.json({ ok: false, error: 'target_date musi byc w formacie YYYY-MM-DD.' }, { status: 400 })
    }
    updates.target_date = target_date
  }
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      return NextResponse.json({
        ok: false,
        error: `status musi byc jednym z: ${VALID_STATUS.join(', ')}.`,
      }, { status: 400 })
    }
    updates.status = status
  }
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'name nie może być pusty.' }, { status: 400 })
    }
    updates.name = name.trim()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Pobierz stan przed zmianą
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: beforeRow } = await (supabase as any)
    .from('milestones')
    .select('target_date, status, name')
    .eq('id', milestone_id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('milestones')
    .update(updates)
    .eq('id', milestone_id)
    .select('id, project_id')
    .maybeSingle()

  if (error) {
    console.error('[mcp/update_milestone] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Milestone nie znaleziony.' }, { status: 404 })
  }

  const row = data as { id: string; project_id: string }

  const beforeLog: Record<string, unknown> = {}
  for (const key of Object.keys(updates)) {
    beforeLog[key] = (beforeRow as Record<string, unknown> | null)?.[key] ?? null
  }

  try {
    await supabase.from('activity_log').insert({
      entity: 'milestone',
      entity_id: row.id,
      action: 'update_milestone',
      actor_id: user.userId,
      before: beforeLog,
      after: updates,
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id, updated: Object.keys(updates) } })
}
