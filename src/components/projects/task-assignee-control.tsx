'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { ChevronDownIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTaskAssignee } from '@/lib/actions/tasks'

export interface Profile {
  id: string
  full_name: string | null
}

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

const NO_ASSIGNEE = '__none__'

function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '').toUpperCase()
}

// ─── Komponent ───────────────────────────────────────────────────────────────

interface TaskAssigneeControlProps {
  taskId: string
  assigneeName: string | null
  profiles: Profile[]
}

export function TaskAssigneeControl({ taskId, assigneeName, profiles }: TaskAssigneeControlProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const ini = initials(assigneeName)
  const currentValue = assigneeName ?? NO_ASSIGNEE

  function handleValueChange(value: string | null) {
    const newName = value === NO_ASSIGNEE || !value ? null : value
    if (newName === assigneeName) return
    setError(null)
    startTransition(async () => {
      const result = await updateTaskAssignee(taskId, newName)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  if (profiles.length === 0) {
    // Brak profili → statyczny avatar
    return (
      <span
        className={cn(
          'inline-grid place-items-center rounded-full bg-muted border border-border font-heading font-semibold text-[0.55rem] text-muted-foreground',
          ini === '—' && 'text-[0.65rem]'
        )}
        style={{ width: 20, height: 20 }}
        title={assigneeName ?? 'Brak osoby'}
        aria-label={assigneeName ?? 'Brak osoby'}
      >
        {ini}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {error ?? ''}
      </span>

      <SelectPrimitive.Root
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={isPending}
      >
        {/* Trigger: avatar inicjałów — klikalny */}
        <SelectPrimitive.Trigger
          aria-label={assigneeName ? `Zmień osobę: ${assigneeName}` : 'Przypisz osobę'}
          aria-busy={isPending}
          title={error ?? assigneeName ?? 'Brak osoby'}
          className={cn(
            'inline-grid place-items-center rounded-full',
            'bg-muted border border-border',
            'font-heading font-semibold text-muted-foreground',
            ini === '—' ? 'text-[0.65rem]' : 'text-[0.55rem]',
            'cursor-pointer select-none',
            'transition-opacity motion-reduce:transition-none',
            'hover:border-teal/60 hover:bg-teal/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed',
            isPending && 'opacity-50',
            error && 'border-destructive/60'
          )}
          style={{ width: 20, height: 20 }}
        >
          {ini}
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Positioner
            side="bottom"
            sideOffset={4}
            align="end"
            className="isolate z-50"
          >
            <SelectPrimitive.Popup
              className={cn(
                'relative isolate z-50 min-w-[160px]',
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
                {/* Opcja „Brak osoby" */}
                <SelectPrimitive.Item
                  value={NO_ASSIGNEE}
                  className={cn(
                    'relative flex w-full cursor-default items-center gap-2',
                    'rounded-md py-1.5 pr-8 pl-2',
                    'text-xs outline-hidden select-none',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-disabled:pointer-events-none data-disabled:opacity-50'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block shrink-0 rounded-full bg-muted-foreground/30"
                    style={{ width: 6, height: 6 }}
                  />
                  <SelectPrimitive.ItemText className="flex-1 text-[0.7rem] font-heading font-medium text-muted-foreground whitespace-nowrap">
                    — Brak osoby
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                    }
                  >
                    <CheckIcon className="pointer-events-none size-3" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>

                {/* Profile — tylko z wypełnionym full_name (brak full_name → UUID nie trafia do DB) */}
                {profiles.filter((p) => p.full_name).map((p) => {
                  const name = p.full_name!
                  return (
                    <SelectPrimitive.Item
                      key={p.id}
                      value={name}
                      className={cn(
                        'relative flex w-full cursor-default items-center gap-2',
                        'rounded-md py-1.5 pr-8 pl-2',
                        'text-xs outline-hidden select-none',
                        'focus:bg-accent focus:text-accent-foreground',
                        'data-disabled:pointer-events-none data-disabled:opacity-50'
                      )}
                    >
                      {/* Mini-avatar inicjałów w menu */}
                      <span
                        aria-hidden="true"
                        className="inline-grid shrink-0 place-items-center rounded-full bg-teal/15 text-teal text-[0.45rem] font-heading font-bold"
                        style={{ width: 14, height: 14 }}
                      >
                        {initials(p.full_name)}
                      </span>
                      <SelectPrimitive.ItemText className="flex-1 text-[0.7rem] font-heading font-medium whitespace-nowrap">
                        {name}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator
                        render={
                          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                        }
                      >
                        <CheckIcon className="pointer-events-none size-3" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  )
                })}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

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
