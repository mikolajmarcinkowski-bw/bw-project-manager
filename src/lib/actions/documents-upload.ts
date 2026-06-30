'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/dal'

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
])
const ALLOWED_EXTENSIONS_LABEL = 'PDF, DOCX, XLSX, PNG, JPG'

export async function uploadDocument(
  projectId: string,
  formData: FormData
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireUser()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Nie wybrano pliku.' }
  }
  if (!projectId) return { error: 'Brak ID projektu.' }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: `Plik jest za duży. Maksymalny rozmiar: 50 MB.` }
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: `Nieobsługiwany format pliku. Dozwolone: ${ALLOWED_EXTENSIONS_LABEL}.` }
  }

  const supabase = createAdminClient()

  // Sprawdź czy projekt istnieje
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Projekt nie znaleziony.' }

  // Ścieżka: {projectId}/{uuid}.{ext} — unikalna per upload
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const uuid = crypto.randomUUID()
  const storagePath = `${projectId}/${uuid}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: storageErr } = await supabase.storage
    .from('project-documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageErr) {
    console.error('[uploadDocument] storage upload failed:', storageErr)
    return { error: 'Nie udało się przesłać pliku. Spróbuj ponownie.' }
  }

  // Zapis metadanych w project_documents
  const docType = ext === 'pdf' ? 'pdf'
    : ext === 'docx' ? 'docx'
    : ext === 'xlsx' ? 'xlsx'
    : ext === 'png' ? 'png'
    : 'jpg'

  const { data: inserted, error: dbErr } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      name: file.name,
      type: docType,
      storage_path: storagePath,
      uploaded_by: user.id,
      content: null,
    })
    .select('id')
    .single()

  if (dbErr || !inserted) {
    // Rollback: usuń plik ze storage
    await supabase.storage.from('project-documents').remove([storagePath])
    console.error('[uploadDocument] db insert failed:', dbErr)
    return { error: 'Nie udało się zapisać dokumentu.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: (inserted as { id: string }).id }
}

export async function deleteDocument(
  documentId: string,
  projectId: string
): Promise<{ ok: true } | { error: string }> {
  await requireUser()

  if (!documentId || !projectId) return { error: 'Brak wymaganych parametrów.' }

  const supabase = createAdminClient()

  const { data: doc } = await supabase
    .from('project_documents')
    .select('id, storage_path, project_id')
    .eq('id', documentId)
    .single()

  if (!doc || doc.project_id !== projectId) {
    return { error: 'Dokument nie znaleziony.' }
  }

  // Usuń plik ze storage (jeśli istnieje)
  if (doc.storage_path) {
    const { error: storageErr } = await supabase.storage
      .from('project-documents')
      .remove([doc.storage_path])

    if (storageErr) {
      console.error('[deleteDocument] storage remove failed:', storageErr)
      // Kontynuuj mimo błędu storage — usuń rekord z DB
    }
  }

  const { error: dbErr } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', documentId)

  if (dbErr) {
    console.error('[deleteDocument] db delete failed:', dbErr)
    return { error: 'Nie udało się usunąć dokumentu.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}
