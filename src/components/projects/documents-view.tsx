'use client'

import { useRef, useState, useTransition } from 'react'
import {
  FileText, FileSpreadsheet, Image, File, Upload,
  Download, Trash2, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ProjectDocument } from '@/lib/data/documents'
import { uploadDocument, deleteDocument } from '@/lib/actions/documents-upload'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FileIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn('shrink-0', className)
  if (type === 'pdf') return <FileText className={cn(cls, 'text-[#E24B4A]')} />
  if (type === 'xlsx') return <FileSpreadsheet className={cn(cls, 'text-[#1D9E75]')} />
  if (type === 'docx') return <FileText className={cn(cls, 'text-[#378ADD]')} />
  if (type === 'png' || type === 'jpg' || type === 'jpeg') return <Image className={cn(cls, 'text-[#EF9F27]')} />
  return <File className={cls} />
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const TYPE_LABEL: Record<string, string> = {
  pdf: 'PDF', docx: 'Word', xlsx: 'Excel', png: 'Obraz PNG', jpg: 'Obraz JPG', jpeg: 'Obraz JPG',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsView({
  projectId,
  initialDocuments,
}: {
  projectId: string
  initialDocuments: ProjectDocument[]
}) {
  const [documents, setDocuments] = useState<ProjectDocument[]>(initialDocuments)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploadError(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    const result = await uploadDocument(projectId, formData)
    setUploading(false)

    if ('error' in result) {
      setUploadError(result.error)
      return
    }

    startTransition(() => {
      // Optymistyczne dodanie — następne odświeżenie zastąpi prawdziwymi danymi
      const now = new Date().toISOString()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      setDocuments(prev => [{
        id: result.id,
        name: file.name,
        type: ext,
        storagePath: null,
        hasContent: false,
        uploadedBy: null,
        createdAt: now,
        downloadUrl: null,
      }, ...prev])
    })
  }

  async function handleDelete(doc: ProjectDocument) {
    if (confirmDeleteId !== doc.id) {
      setConfirmDeleteId(doc.id)
      return
    }
    setConfirmDeleteId(null)
    setDeletingId(doc.id)

    const result = await deleteDocument(doc.id, projectId)
    setDeletingId(null)

    if ('error' in result) {
      setUploadError(result.error)
      return
    }

    setDocuments(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm text-foreground">Dokumenty projektu</h3>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            PDF, DOCX, XLSX, PNG, JPG · max 50 MB
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="flex items-center gap-1.5 font-meta text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Przesyłanie…
            </span>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="active:scale-[0.97] active:opacity-90"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Wgraj dokument
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Error */}
      {uploadError && (
        <div
          role="alert"
          className="rounded-lg border border-[#E24B4A]/30 bg-[#FCEBEB] px-4 py-3 font-meta text-xs text-[#A32D2D] flex items-start gap-2"
        >
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{uploadError}</span>
          <button
            type="button"
            className="ml-auto font-semibold hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E24B4A] rounded"
            onClick={() => setUploadError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Lista dokumentów */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="rounded-xl border border-border bg-card p-4 text-muted-foreground">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm text-foreground">Brak dokumentów</p>
            <p className="font-meta text-xs text-muted-foreground mt-1">
              Wgraj SOW, PDP, prezentację lub inny dokument projektu
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-1 active:scale-[0.97] active:opacity-90"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Dodaj pierwszy dokument
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5" role="list" aria-label="Dokumenty projektu">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={cn(
                'group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3',
                'transition-colors hover:border-border/80 hover:bg-card/80',
                deletingId === doc.id && 'opacity-50 pointer-events-none'
              )}
            >
              <FileIcon type={doc.type} className="w-5 h-5" />

              <div className="flex-1 min-w-0">
                <p className="font-meta text-sm font-medium text-foreground truncate">{doc.name}</p>
                <p className="font-meta text-xs text-muted-foreground mt-0.5">
                  {TYPE_LABEL[doc.type] ?? doc.type.toUpperCase()}
                  {' · '}
                  {formatDate(doc.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {doc.downloadUrl ? (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground',
                      'transition-colors hover:text-foreground hover:bg-muted',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
                      'active:scale-[0.97] active:opacity-90'
                    )}
                    aria-label={`Pobierz ${doc.name}`}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground/40" aria-hidden>
                    <Download className="w-4 h-4" />
                  </span>
                )}

                {confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
                    <span className="font-meta text-xs text-[#A32D2D] pr-1">Usunąć?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className={cn(
                        'rounded-md px-2 py-1 font-meta text-xs font-semibold text-white bg-[#E24B4A]',
                        'hover:bg-[#c53e3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E24B4A]',
                        'active:scale-[0.97] transition-colors'
                      )}
                    >
                      Usuń
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className={cn(
                        'rounded-md px-2 py-1 font-meta text-xs text-muted-foreground',
                        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                        'active:scale-[0.97] transition-colors'
                      )}
                    >
                      Anuluj
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    className={cn(
                      'inline-flex items-center justify-center rounded-md p-1.5',
                      'text-muted-foreground transition-colors',
                      'hover:text-[#E24B4A] hover:bg-[#FCEBEB]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
                      'active:scale-[0.97] active:opacity-90',
                      'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity'
                    )}
                    aria-label={`Usuń ${doc.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
