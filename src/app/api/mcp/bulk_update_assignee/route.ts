import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    from_assignee?: string
    to_assignee?: string | null
    task_ids?: string[]
  }

  if (!body.project_id) return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  if (body.from_assignee === undefined) return NextResponse.json({ ok: false, error: 'from_assignee jest wymagany.' }, { status: 400 })
  if (body.to_assignee === undefined) return NextResponse.json({ ok: false, error: 'to_assignee jest wymagany (null = usuń przypisanie).' }, { status: 400 })

  const supabase = createAdminClient()

  // Walidacja to_assignee względem team_members
  if (body.to_assignee !== null && body.to_assignee !== '') {
    const { data: members } = await supabase.from('team_members').select('full_name').eq('is_active', true)
    const names = (members ?? []).map(m => m.full_name.toLowerCase())
    if (!names.includes(body.to_assignee.toLowerCase())) {
      const available = (members ?? []).map(m => m.full_name).join(', ')
      return NextResponse.json({
        ok: false,
        error: `Nieznany konsultant: "${body.to_assignee}". Dostępni: ${available || 'brak aktywnych konsultantów'}`,
      }, { status: 400 })
    }
  }

  try {
    // Znajdź zadania do zaktualizowania
    let query = supabase
      .from('tasks')
      .select('id, title, assignee_name')
      .eq('project_id', body.project_id)

    if (body.task_ids && body.task_ids.length > 0) {
      query = query.in('id', body.task_ids)
    } else {
      // Filtruj po from_assignee
      if (body.from_assignee === null || body.from_assignee === '') {
        query = query.is('assignee_name', null)
      } else {
        query = query.eq('assignee_name', body.from_assignee)
      }
    }

    const { data: tasks, error: fetchErr } = await query
    if (fetchErr) return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })

    const taskIds = (tasks ?? []).map(t => t.id)
    if (taskIds.length === 0) {
      return NextResponse.json({ ok: true, data: { updatedCount: 0, message: 'Brak zadań do zaktualizowania.' } })
    }

    const newAssignee = body.to_assignee || null
    const { error: updErr } = await supabase
      .from('tasks')
      .update({ assignee_name: newAssignee })
      .in('id', taskIds)

    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })

    // Jeden activity_log wpis per projekt (nie per zadanie — żeby nie zaśmiecać)
    try {
      await supabase.from('activity_log').insert({
        entity: 'project',
        entity_id: body.project_id,
        action: 'bulk_update_assignee',
        actor_id: userId,
        before: { from_assignee: body.from_assignee, task_ids: taskIds },
        after: { to_assignee: newAssignee, updated_count: taskIds.length },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      ok: true,
      data: {
        updatedCount: taskIds.length,
        from: body.from_assignee,
        to: newAssignee,
        taskIds,
      },
    })
  } catch (err) {
    console.error('[mcp/bulk_update_assignee] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
