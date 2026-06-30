import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { document_id?: string }

  if (!body.document_id) {
    return NextResponse.json({ ok: false, error: 'document_id jest wymagany.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('project_documents')
      .select('id, name, type, content, storage_path, project_id, uploaded_by, created_at')
      .eq('id', body.document_id)
      .single()

    if (error?.code === 'PGRST116' || !data) {
      return NextResponse.json({ ok: false, error: 'Dokument nie znaleziony.' }, { status: 404 })
    }
    if (error) {
      console.error('[mcp/get_document_content] fetch failed:', error)
      return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        content: data.content,
        storagePath: data.storage_path ?? null,
        projectId: data.project_id,
        uploadedBy: data.uploaded_by ?? null,
        createdAt: data.created_at,
      },
    })
  } catch (err) {
    console.error('[mcp/get_document_content] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
