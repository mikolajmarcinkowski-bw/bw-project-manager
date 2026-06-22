import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/dal'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin()
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const title = typeof body.step_title === 'string' ? body.step_title.trim() : null
  if (!title || title.length > 200) {
    return NextResponse.json({ ok: false, error: 'Nieprawidłowy tytuł.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('step_templates')
    .update({ step_title: title })
    .eq('id', id)

  if (error) return NextResponse.json({ ok: false, error: 'Błąd zapisu.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
