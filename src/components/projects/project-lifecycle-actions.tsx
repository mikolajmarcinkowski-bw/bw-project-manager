'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markProjectCompleted } from '@/lib/actions/projects'
import { ArchiveDialog } from './archive-dialog'

// ─── Typy ─────────────────────────────────────────────────────────────────────

interface ProjectLifecycleActionsProps {
  project: {
    id: string
    name: string
    status: string
  }
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function ProjectLifecycleActions({ project }: ProjectLifecycleActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Dla archived: ProjectStatusBadge w project-header już pokazuje status — tu nic nie renderujemy
  if (project.status === 'archived') {
    return null
  }

  // Dla completed: ProjectStatusBadge już jest widoczny — pokazujemy tylko przycisk Archiwizuj
  if (project.status === 'completed') {
    return <ArchiveDialog project={{ id: project.id, name: project.name }} />
  }

  // status === 'active'
  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          const result = await markProjectCompleted(project.id)
          if ('error' in result) {
            // Brak globalnego toast — error wyświetl w konsoli, UI nie blokuje
            console.error('[ProjectLifecycleActions] markProjectCompleted:', result.error)
          } else {
            router.refresh()
          }
        })
      }}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40',
        'px-3 py-1.5 text-xs font-medium text-muted-foreground',
        'transition-colors hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <CheckCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {isPending ? 'Zapisywanie…' : 'Oznacz jako zakończony'}
    </button>
  )
}
