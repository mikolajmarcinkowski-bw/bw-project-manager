import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as { project_id?: string }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // risks not in generated types yet — cast to any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawRisks, error } = await (supabase as any)
      .from('risks')
      .select('id, description, category, phase, probability, impact, score, rag, owner, mitigation, status, created_at')
      .eq('project_id', body.project_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[mcp/get_risks] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const data = (rawRisks ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      description: r.description,
      category: r.category ?? null,
      phase: r.phase ?? null,
      probability: r.probability ?? null,
      impact: r.impact ?? null,
      score: r.score ?? null,
      rag: r.rag ?? null,
      owner: r.owner ?? null,
      mitigation: r.mitigation ?? null,
      status: r.status,
      createdAt: r.created_at,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_risks] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
