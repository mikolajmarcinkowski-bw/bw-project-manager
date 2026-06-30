import { createAdminClient } from '@/lib/supabase/admin'

export interface ProjectDocument {
  id: string
  name: string
  type: string
  storagePath: string | null
  hasContent: boolean
  uploadedBy: string | null
  createdAt: string
  downloadUrl: string | null
}

export async function getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('project_documents')
    .select('id, name, type, storage_path, content, uploaded_by, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  const docs = await Promise.all(
    data.map(async (doc) => {
      let downloadUrl: string | null = null

      if (doc.storage_path) {
        const { data: signed } = await supabase.storage
          .from('project-documents')
          .createSignedUrl(doc.storage_path, 3600)
        downloadUrl = signed?.signedUrl ?? null
      }

      return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        storagePath: doc.storage_path ?? null,
        hasContent: doc.content !== null,
        uploadedBy: doc.uploaded_by ?? null,
        createdAt: doc.created_at,
        downloadUrl,
      }
    })
  )

  return docs
}
