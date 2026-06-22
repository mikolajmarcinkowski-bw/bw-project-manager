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

  const updates: Record<string, unknown> = {}
  if (typeof body.task_title === 'string') {
    const t = body.task_title.trim()
    if (!t || t.length > 300) return NextResponse.json({ ok: false, error: 'Nieprawidłowy tytuł.' }, { status: 400 })
    updates.task_title = t
  }
  if (body.est !== undefined) {
    const est = body.est === null ? null : Number(body.est)
    if (est !== null && (!Number.isFinite(est) || est < 0 || est > 9999)) {
      return NextResponse.json({ ok: false, error: 'Nieprawidłowa estymacja.' }, { status: 400 })
    }
    updates.est = est
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'Brak zmian.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('step_task_templates').update(updates).eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: 'Błąd zapisu.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
