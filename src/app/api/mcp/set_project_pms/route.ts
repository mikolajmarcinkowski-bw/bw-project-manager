import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('api_tokens' as any)
    .select('user_id')
    .eq('token', token)
    .is('revoked_at', null)
    .single()
  return data?.user_id ?? null
}

export async function POST(request: NextRequest) {
  const userId = await verifyToken(request.headers.get('authorization'))
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.project_id || !Array.isArray(body.pm_ids)) {
    return NextResponse.json({ ok: false, error: 'project_id and pm_ids[] required' }, { status: 400 })
  }
  const supabase = createAdminClient()
  await supabase.from('project_pms').delete().eq('project_id', body.project_id)
  if (body.pm_ids.length > 0) {
    const { error } = await supabase.from('project_pms').insert(
      body.pm_ids.map((id: string) => ({ project_id: body.project_id, profile_id: id }))
    )
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: { pm_ids: body.pm_ids } })
}
