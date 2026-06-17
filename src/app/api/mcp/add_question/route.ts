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

  const { project_id, question, rag } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }
  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json({ ok: false, error: 'question jest wymagany.' }, { status: 400 })
  }
  if (rag !== undefined && !VALID_RAG.includes(rag as (typeof VALID_RAG)[number])) {
    return NextResponse.json({ ok: false, error: "rag musi byc 'R', 'A' lub 'G'." }, { status: 400 })
  }

  const supabase = createAdminClient()

  // TODO: questions_doubts not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('questions_doubts')
    .insert({
      project_id,
      question: (question as string).trim(),
      rag: typeof rag === 'string' ? rag : null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[mcp/add_question] failed:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const questionId = (data as { id: string }).id

  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'add_question',
      actor_id: user.userId,
      before: null,
      after: { question_id: questionId, question, rag },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { id: questionId } }, { status: 201 })
}
