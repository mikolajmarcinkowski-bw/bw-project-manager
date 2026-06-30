import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.project_id) return NextResponse.json({ ok: false, error: 'project_id required' }, { status: 400 })
  const supabase = createAdminClient()
  // Sprawdź istnienie projektu przed UPDATE
  const { data: existing } = await supabase.from('projects').select('id, status').eq('id', body.project_id).single()
  if (!existing) return NextResponse.json({ ok: false, error: 'Projekt nie istnieje.' }, { status: 404 })

  const { error } = await supabase.from('projects').update({ status: 'completed' }).eq('id', body.project_id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Activity log tylko po potwierdzeniu zapisu
  supabase.from('activity_log' as any).insert({
    entity: 'project', entity_id: body.project_id,
    action: 'mark_completed', actor_id: user.userId,
    before: { status: existing.status }, after: { status: 'completed' },
  }).then(({ error }) => {
    if (error) console.error('[mark_project_completed] activity_log failed:', error)
  })

  // Pobierz client_id żeby rewalidować widok klienta
  const { data: projectRow } = await supabase
    .from('projects').select('client_id').eq('id', body.project_id).single()

  revalidatePath(`/projects/${body.project_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/projekty')
  if (projectRow?.client_id) revalidatePath(`/clients/${projectRow.client_id}`)

  return NextResponse.json({ ok: true, data: { status: 'completed' } })
}
