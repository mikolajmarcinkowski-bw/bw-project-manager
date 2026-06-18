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

  if (project.status === 'archived') {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground select-none">
        Zarchiwizowany
      </span>
    )
  }

  if (project.status === 'completed') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-teal/30 bg-teal/5 px-2.5 py-1 text-[0.7rem] font-semibold text-teal select-none whitespace-nowrap">
          Zakończony
        </span>
        <ArchiveDialog project={{ id: project.id, name: project.name }} />
      </div>
    )
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
