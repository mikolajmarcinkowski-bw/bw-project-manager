import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { project_id?: string }
  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('project_documents')
      .select('id, name, type, storage_path, content, uploaded_by, created_at')
      .eq('project_id', body.project_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[mcp/get_documents] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    const documents = (data ?? []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      storagePath: d.storage_path ?? null,
      hasContent: d.content !== null,
      uploadedBy: d.uploaded_by ?? null,
      createdAt: d.created_at,
    }))

    return NextResponse.json({ ok: true, data: { documents } })
  } catch (err) {
    console.error('[mcp/get_documents] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
