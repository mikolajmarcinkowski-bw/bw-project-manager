import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    status?: string
  }
  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('questions_doubts')
      .select('id, question, answer, rag, status, asked_date, created_at')
      .eq('project_id', body.project_id)
      .order('created_at', { ascending: true })

    if (body.status) {
      query = query.eq('status', body.status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[mcp/get_questions] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const questions = (data ?? []).map((q: Record<string, unknown>) => ({
      id: q.id,
      question: q.question,
      answer: q.answer ?? null,
      rag: q.rag ?? null,
      status: q.status,
      askedDate: q.asked_date ?? null,
      createdAt: q.created_at,
    }))

    return NextResponse.json({ ok: true, data: { questions } })
  } catch (err) {
    console.error('[mcp/get_questions] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
