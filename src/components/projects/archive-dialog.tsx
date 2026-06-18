'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { archiveProject } from '@/lib/actions/projects'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// ─── Typy ─────────────────────────────────────────────────────────────────────

interface ArchiveDialogProps {
  project: {
    id: string
    name: string
  }
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function ArchiveDialog({ project }: ArchiveDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = confirmName.trim().toLowerCase() === project.name.trim().toLowerCase()

  function openDialog() {
    setConfirmName('')
    setError(null)
    setOpen(true)
  }

  function handleArchive() {
    if (!isConfirmed) {
      setError('Podana nazwa projektu nie zgadza się.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await archiveProject(project.id, confirmName)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        router.push('/archiwum')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40',
          'px-3 py-1.5 text-xs font-medium text-muted-foreground',
          'transition-colors hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1'
        )}
      >
        <Archive aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        Archiwizuj
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive aria-hidden="true" className="h-4 w-4 text-muted-foreground shrink-0" />
              Archiwizuj projekt
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {/* Ostrzeżenie */}
            <div className="rounded-lg border border-status-at/30 bg-status-at/5 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              Projekt zostanie przeniesiony do archiwum.{' '}
              <span className="font-semibold text-foreground">Tej operacji nie można cofnąć.</span>
            </div>

            {/* Potwierdzenie nazwą */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="archive-confirm-name">
                Wpisz nazwę projektu:{' '}
                <span className="font-mono font-bold text-foreground">{project.name}</span>
              </Label>
              <Input
                id="archive-confirm-name"
                value={confirmName}
                onChange={(e) => {
                  setConfirmName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="Nazwa projektu..."
                autoComplete="off"
                className={cn(isConfirmed && confirmName.length > 0 && 'border-teal')}
                disabled={isPending}
              />
            </div>

            {/* Błąd */}
            {error && (
              <p className="font-meta text-xs text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={handleArchive}
              disabled={!isConfirmed || isPending}
            >
              {isPending ? 'Archiwizowanie…' : 'Archiwizuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
