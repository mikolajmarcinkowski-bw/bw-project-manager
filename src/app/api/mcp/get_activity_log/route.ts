import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    task_id?: string
    limit?: number
  }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // activity_log.actor_id has FK to profiles — Supabase supports FK join via select
    let query = supabase
      .from('activity_log')
      .select('id, entity, entity_id, action, actor_id, before, after, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(body.limit ?? 50)

    if (body.task_id) {
      query = query.eq('entity_id', body.task_id)
    } else {
      query = query.eq('entity_id', body.project_id)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('[mcp/get_activity_log] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const data = (logs ?? []).map((log) => {
      const profilesField = log.profiles
      const profile = Array.isArray(profilesField)
        ? (profilesField[0] as { full_name: string | null } | undefined) ?? null
        : (profilesField as { full_name: string | null } | null)

      return {
        id: log.id,
        entity: log.entity,
        entityId: log.entity_id,
        action: log.action,
        actorId: log.actor_id,
        actorName: profile?.full_name ?? null,
        before: log.before,
        after: log.after,
        createdAt: log.created_at,
      }
    })

    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[mcp/get_activity_log] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
