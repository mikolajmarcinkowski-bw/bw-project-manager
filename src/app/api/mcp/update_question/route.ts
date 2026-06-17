import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_RAG = ['R', 'A', 'G'] as const
const VALID_STATUS = ['open', 'closed'] as const

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

  const { question_id, answer, rag, status } = body

  if (typeof question_id !== 'string' || !question_id.trim()) {
    return NextResponse.json({ ok: false, error: 'question_id jest wymagany.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (answer !== undefined) {
    updates.answer = typeof answer === 'string' ? answer.trim() || null : null
  }
  if (rag !== undefined) {
    if (!VALID_RAG.includes(rag as (typeof VALID_RAG)[number])) {
      return NextResponse.json({ ok: false, error: "rag musi byc 'R', 'A' lub 'G'." }, { status: 400 })
    }
    updates.rag = rag
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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak pol do aktualizacji.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: questions_doubts not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('questions_doubts')
    .update(updates)
    .eq('id', question_id)
    .select('id, project_id')
    .single()

  if (error) {
    console.error('[mcp/update_question] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const row = data as { id: string; project_id: string }

  try {
    await supabase.from('activity_log').insert({
      entity: 'question',
      entity_id: row.id,
      action: 'update_question',
      actor_id: user.userId,
      before: null,
      after: updates,
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: row.id } })
}
