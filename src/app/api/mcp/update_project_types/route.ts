import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_TYPES = ['CRM', 'SPO', 'INT', 'MKT', 'ERP'] as const
type ImplType = (typeof VALID_TYPES)[number]

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as { project_id?: string; type?: unknown[] }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }
  if (!Array.isArray(body.type) || body.type.length === 0) {
    return NextResponse.json({ ok: false, error: 'type[] wymagany co najmniej jeden element' }, { status: 400 })
  }

  const newTypes: ImplType[] = []
  for (const t of body.type) {
    if (!VALID_TYPES.includes(t as ImplType)) {
      return NextResponse.json({ ok: false, error: `Nieprawidłowy typ: ${t}` }, { status: 400 })
    }
    newTypes.push(t as ImplType)
  }

  try {
    const supabase = createAdminClient()

    // Verify project exists
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', body.project_id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ ok: false, error: 'Projekt nie znaleziony' }, { status: 404 })
    }

    // Get current types
    const { data: currentRows } = await supabase
      .from('project_types')
      .select('type')
      .eq('project_id', body.project_id)

    const currentTypes = (currentRows ?? []).map(r => r.type as string)
    const added = newTypes.filter(t => !currentTypes.includes(t))
    const removed = currentTypes.filter(t => !newTypes.includes(t as ImplType))

    // Replace types atomically
    const { error: delErr } = await supabase
      .from('project_types')
      .delete()
      .eq('project_id', body.project_id)

    if (delErr) {
      console.error('[mcp/update_project_types] delete failed:', delErr)
      return NextResponse.json({ ok: false, error: 'Nie udało się zaktualizować typów' }, { status: 500 })
    }

    const { error: insErr } = await supabase
      .from('project_types')
      .insert(newTypes.map(type => ({ project_id: body.project_id!, type })))

    if (insErr) {
      console.error('[mcp/update_project_types] insert failed:', insErr)
      return NextResponse.json({ ok: false, error: 'Nie udało się zapisać nowych typów' }, { status: 500 })
    }

    // Find tasks that are now outside the new type set (informational — Claude decides what to do)
    const newTypesSet = new Set<string>(newTypes)
    const { data: outOfScopeTasks } = await supabase
      .from('tasks')
      .select('id, title, type, hidden')
      .eq('project_id', body.project_id)
      .eq('hidden', false)

    const tasksOutOfScope = (outOfScopeTasks ?? [])
      .filter(t => {
        const taskTypes: string[] = (t.type as string[] | null) ?? []
        if (taskTypes.length === 0) return false // applies to all types
        return !taskTypes.some(tt => newTypesSet.has(tt))
      })
      .map(t => ({ id: t.id, title: t.title, types: t.type }))

    try {
      await supabase.from('activity_log' as never).insert({
        entity: 'project',
        entity_id: body.project_id,
        action: 'update_project_types',
        actor_id: userId,
        before: { types: currentTypes },
        after: { types: newTypes },
      })
    } catch { /* activity log non-critical */ }

    return NextResponse.json({
      ok: true,
      data: {
        types: newTypes,
        added,
        removed,
        tasksOutOfScope,
        note: tasksOutOfScope.length > 0
          ? `${tasksOutOfScope.length} widocznych zadań jest spoza wybranych typów — rozważ bulk_hide_tasks`
          : null,
      },
    })
  } catch (err) {
    console.error('[mcp/update_project_types] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
