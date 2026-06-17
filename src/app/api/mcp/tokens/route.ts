import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST: utwórz nowy token
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = ((body as Record<string, unknown>).name ?? 'Token') as string
  const safeName = String(name).slice(0, 100)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('api_tokens')
    .insert({ user_id: user.id, name: safeName })
    .select('id, token, name, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create token' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, data })
}

// GET: lista tokenów
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('api_tokens')
    .select('id, name, created_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: data ?? [] })
}
