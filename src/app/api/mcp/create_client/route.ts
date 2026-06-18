import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ ok: false, error: 'name jest wymagany.' }, { status: 400 })

  const nip = (body.nip ?? '').trim().replace(/[-\s]/g, '') || null
  if (nip && !/^\d{10}$/.test(nip)) {
    return NextResponse.json({ ok: false, error: 'NIP musi miec 10 cyfr.' }, { status: 400 })
  }

  let hubspot_url = (body.hubspot_url ?? '').trim() || null
  if (hubspot_url && !/^https?:\/\//i.test(hubspot_url)) {
    hubspot_url = `https://${hubspot_url}`
  }

  const supabase = createAdminClient()

  // Sprawdz czy klient juz istnieje (case-insensitive)
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      ok: true,
      data: { client_id: existing.id, name: existing.name, already_existed: true }
    })
  }

  const { data: inserted, error } = await supabase
    .from('clients')
    .insert({ name, nip, hubspot_url })
    .select('id, name')
    .single()

  if (error || !inserted) {
    console.error('[mcp/create_client] failed:', error)
    return NextResponse.json({ ok: false, error: 'Nie udalo sie utworzyc klienta.' }, { status: 500 })
  }

  // Activity log (non-blocking)
  const { error: logError } = await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: inserted.id,
    action: 'create_client',
    actor_id: user.userId,
    before: null,
    after: { name, nip, hubspot_url },
  })
  if (logError) console.error('[mcp/create_client] log failed:', logError)

  revalidatePath('/dashboard')

  return NextResponse.json({
    ok: true,
    data: { client_id: inserted.id, name: inserted.name, already_existed: false }
  })
}
