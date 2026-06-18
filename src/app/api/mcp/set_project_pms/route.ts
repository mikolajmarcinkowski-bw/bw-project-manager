import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.project_id || !Array.isArray(body.pm_ids)) {
    return NextResponse.json({ ok: false, error: 'project_id and pm_ids[] required' }, { status: 400 })
  }
  const supabase = createAdminClient()
  // Walidacja pm_ids przed DELETE — unikamy stanu "zero PM-ów" przy błędzie INSERT
  if (body.pm_ids.length > 0) {
    const uniqueIds = [...new Set(body.pm_ids)] as string[]
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .in('id', uniqueIds)
      .eq('is_active', true)
    if (profileErr) return NextResponse.json({ ok: false, error: 'Nie udało się zweryfikować profili.' }, { status: 500 })
    if ((profiles?.length ?? 0) < uniqueIds.length) {
      return NextResponse.json({ ok: false, error: 'Niektóre profile nie istnieją lub są nieaktywne.' }, { status: 400 })
    }
    // Teraz bezpiecznie: DELETE + INSERT
    const { error: delErr } = await supabase.from('project_pms').delete().eq('project_id', body.project_id)
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })
    const { error: insErr } = await supabase.from('project_pms').insert(
      uniqueIds.map((id: string) => ({ project_id: body.project_id, profile_id: id }))
    )
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
  } else {
    // Czyść PM-ów
    const { error: delErr } = await supabase.from('project_pms').delete().eq('project_id', body.project_id)
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })
  }

  // Activity log — nieblokujące
  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: body.project_id,
      action: 'set_project_pms',
      actor_id: user.userId,
      before: null,
      after: { pm_ids: body.pm_ids },
    })
  } catch { /* ignore log failures */ }

  return NextResponse.json({ ok: true, data: { pm_ids: body.pm_ids } })
}
