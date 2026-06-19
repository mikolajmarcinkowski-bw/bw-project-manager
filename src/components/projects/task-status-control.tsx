'use client'

import { useTransition, useState, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTaskStatus, type TaskStatus } from '@/lib/actions/tasks'

// ─── Mapowania statusów ──────────────────────────────────────────────────────

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo:        'Zaplanowane',
  in_progress: 'W toku',
  done:        'Gotowe',
  for_quality: 'QA / Weryfikacja',
  na:          'N/D',
}

// Zgodne z kodem TaskStatusPill w gantt-chart.tsx (in_progress = teal, for_quality = status-quality)
const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  todo:        'bg-muted text-muted-foreground',
  in_progress: 'bg-teal/10 text-teal',
  done:        'bg-teal/15 text-teal-strong',
  for_quality: 'bg-status-quality/15 text-status-quality',
  na:          'bg-muted/50 text-muted-foreground/60 line-through',
}

// Kolorowa kropka identyfikująca status w menu
const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  todo:        'bg-muted-foreground/60',
  in_progress: 'bg-teal',
  done:        'bg-teal-strong',
  for_quality: 'bg-status-quality',
  na:          'bg-muted-foreground/40',
}

const ALL_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'for_quality', 'na']

// ─── Komponent ───────────────────────────────────────────────────────────────

interface TaskStatusControlProps {
  taskId: string
  status: TaskStatus
}

export function TaskStatusControl({ taskId, status }: TaskStatusControlProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Optimistic update — UI zmienia się natychmiast, sync z serwerem w tle
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_: TaskStatus, next: TaskStatus) => next
  )

  function handleValueChange(newStatus: TaskStatus | null) {
    if (!newStatus || newStatus === status) return
    setError(null)
    startTransition(async () => {
      setOptimisticStatus(newStatus)
      const result = await updateTaskStatus(taskId, newStatus)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      {/* Aria-live region na błędy — niewidoczny, czytany przez screenreadery */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {error ?? ''}
      </span>

      <SelectPrimitive.Root
        value={optimisticStatus}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        {/* Trigger: pill klikalny z chevronem */}
        <SelectPrimitive.Trigger
          aria-label="Zmień status zadania"
          aria-busy={isPending}
          title={error ?? undefined}
          className={cn(
            // Bazowy wygląd jak TaskStatusPill
            'inline-flex items-center gap-0.5',
            'rounded-full px-1.5 py-0.5',
            'text-[0.6rem] font-semibold font-heading leading-none',
            // Interaktywność
            'cursor-pointer select-none',
            'transition-colors motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed',
            // Kolor wg optimistic statusu
            TASK_STATUS_CLASSES[optimisticStatus],
            // Podczas oczekiwania
            isPending && 'cursor-wait'
          )}
        >
          {TASK_STATUS_LABEL[optimisticStatus]}
          <ChevronDownIcon
            aria-hidden="true"
            className="size-2.5 shrink-0 opacity-60"
          />
        </SelectPrimitive.Trigger>

        {/* Portal + Positioner + Popup — poza statyką tabeli */}
        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            side="bottom"
            sideOffset={4}
            align="start"
            className="isolate z-50"
          >
            <SelectPrimitive.Popup
              className={cn(
                'relative isolate z-50 min-w-[130px]',
                'origin-(--transform-origin)',
                'overflow-hidden rounded-lg',
                'bg-popover text-popover-foreground',
                'shadow-md ring-1 ring-foreground/10',
                'duration-100',
                'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
                'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                'data-[side=bottom]:slide-in-from-top-2',
                'data-[side=top]:slide-in-from-bottom-2'
              )}
            >
              <SelectPrimitive.List className="p-1">
                {ALL_STATUSES.map((s) => (
                  <SelectPrimitive.Item
                    key={s}
                    value={s}
                    className={cn(
                      'relative flex w-full cursor-default items-center gap-2',
                      'rounded-md py-1.5 pr-8 pl-2',
                      'text-xs outline-hidden select-none',
                      'focus:bg-accent focus:text-accent-foreground',
                      'data-disabled:pointer-events-none data-disabled:opacity-50'
                    )}
                  >
                    {/* Kolorowa kropka */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'inline-block shrink-0 rounded-full',
                        TASK_STATUS_DOT[s]
                      )}
                      style={{ width: 6, height: 6 }}
                    />
                    {/* Etykieta — Base UI wymaga SelectPrimitive.ItemText dla a11y */}
                    <SelectPrimitive.ItemText className="flex-1 text-[0.7rem] font-heading font-medium whitespace-nowrap">
                      {TASK_STATUS_LABEL[s]}
                    </SelectPrimitive.ItemText>
                    {/* Checkmark dla aktualnie zaznaczonego */}
                    <SelectPrimitive.ItemIndicator
                      render={
                        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                      }
                    >
                      <CheckIcon className="pointer-events-none size-3" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {/* Dyskretny błąd wizualny pod pillem (widoczny, gdy jest) */}
      {error && (
        <span
          aria-hidden="true"
          className="block max-w-[72px] truncate text-[0.5rem] font-heading text-destructive leading-none"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  )
}
