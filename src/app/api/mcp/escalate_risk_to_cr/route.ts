import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    risk_id?: string
    title?: string
    description?: string
  }

  if (!body.risk_id) {
    return NextResponse.json({ ok: false, error: 'risk_id jest wymagany.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // Pobierz ryzyko
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: risk, error: riskErr } = await (supabase as any)
      .from('risks')
      .select('id, project_id, description, rag, probability, impact, owner')
      .eq('id', body.risk_id)
      .single()

    if (riskErr || !risk) {
      return NextResponse.json({ ok: false, error: 'Ryzyko nie znalezione.' }, { status: 404 })
    }

    const r = risk as { id: string; project_id: string; description: string; rag: string; probability: number; impact: number; owner: string }
    const crTitle = body.title?.trim() || `Eskalacja ryzyka: ${r.description.slice(0, 80)}`
    const crDesc = body.description?.trim() ||
      `Eskalacja ryzyka (RAG=${r.rag}, P=${r.probability}×I=${r.impact}=${r.probability * r.impact}): ${r.description}. Właściciel ryzyka: ${r.owner}.`

    // Utwórz CR
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cr, error: crErr } = await (supabase as any)
      .from('change_requests')
      .insert({
        project_id: r.project_id,
        title: crTitle,
        description: crDesc,
        cr_type: 'scope',
        status: 'pending',
        bw_approval: 'pending',
        submitted_by: userId,
      })
      .select('id')
      .single()

    if (crErr || !cr) {
      console.error('[escalate_risk_to_cr] CR insert failed:', crErr)
      return NextResponse.json({ ok: false, error: 'Nie udało się utworzyć CR.' }, { status: 500 })
    }

    const crId = (cr as { id: string }).id

    // Zaktualizuj ryzyko na monitor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('risks').update({ status: 'monitor' }).eq('id', body.risk_id)

    // Activity log
    try {
      await supabase.from('activity_log').insert({
        entity: 'project',
        entity_id: r.project_id,
        action: 'escalate_risk_to_cr',
        actor_id: userId,
        before: { risk_id: body.risk_id, risk_status: 'open' },
        after: { cr_id: crId, risk_status: 'monitor' },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      ok: true,
      data: {
        riskId: body.risk_id,
        crId,
        crTitle,
        crStatus: 'pending',
        riskStatus: 'monitor',
      },
    })
  } catch (err) {
    console.error('[escalate_risk_to_cr] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
