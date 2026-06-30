'use client'

import { useState, useTransition } from 'react'
import { Pencil, Users, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { updateProjectPms } from '@/lib/actions/projects'

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProjectPmsDialogProps {
  projectId: string
  currentPmIds: string[]
  profiles: { id: string; full_name: string | null }[]
}

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function sortProfiles(
  profiles: { id: string; full_name: string | null }[],
  selectedIds: Set<string>
): { id: string; full_name: string | null }[] {
  return [...profiles].sort((a, b) => {
    const aSelected = selectedIds.has(a.id)
    const bSelected = selectedIds.has(b.id)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    const aName = a.full_name ?? ''
    const bName = b.full_name ?? ''
    return aName.localeCompare(bName, 'pl')
  })
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function EditProjectPmsDialog({
  projectId,
  currentPmIds,
  profiles,
}: EditProjectPmsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPmIds))
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) {
      // Reset do aktualnego stanu przy otwarciu
      setSelected(new Set(currentPmIds))
      setSubmitError(null)
    }
  }

  function toggleProfile(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleSave() {
    setSubmitError(null)
    startTransition(async () => {
      const result = await updateProjectPms(projectId, Array.from(selected))
      if ('error' in result) {
        setSubmitError(result.error)
      } else {
        setOpen(false)
      }
    })
  }

  const sorted = sortProfiles(profiles, selected)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edytuj PM-ów projektu"
            className={[
              'inline-flex items-center justify-center rounded p-0.5',
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
              'text-muted-foreground hover:text-foreground',
              'transition-opacity duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
              'active:scale-[0.97] active:opacity-90',
            ].join(' ')}
          />
        }
      >
        <Pencil size={12} aria-hidden="true" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users size={14} aria-hidden="true" className="text-teal-strong shrink-0" />
            PM Prowadzący
          </DialogTitle>
          <DialogDescription className="text-xs">
            Wybierz PM-ów przypisanych do tego projektu. Możesz wybrać kilku lub żadnego.
          </DialogDescription>
        </DialogHeader>

        {/* Lista profili */}
        <div className="flex flex-col gap-1 mt-1 max-h-64 overflow-y-auto pr-1">
          {sorted.map((profile) => {
            const isChecked = selected.has(profile.id)
            const name = profile.full_name ?? profile.id
            return (
              <label
                key={profile.id}
                className={[
                  'flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer',
                  'transition-colors hover:border-teal/40 hover:bg-muted/60',
                  'has-[:checked]:border-teal has-[:checked]:bg-teal/5',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1',
                  isChecked ? 'border-teal bg-teal/5' : 'border-border',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleProfile(profile.id)}
                  className="peer sr-only"
                />
                {/* Avatar inicjały */}
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-[0.6rem] font-semibold text-teal-strong"
                >
                  {initials(profile.full_name)}
                </span>
                {/* Imię */}
                <span className="flex-1 min-w-0 text-sm font-medium truncate">{name}</span>
                {/* Znacznik zaznaczenia */}
                <Check
                  size={14}
                  aria-hidden="true"
                  className="shrink-0 text-teal opacity-0 transition-opacity peer-checked:opacity-100"
                />
              </label>
            )
          })}

          {profiles.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Brak aktywnych profili w systemie.
            </p>
          )}
        </div>

        {/* Info gdy żaden PM nie wybrany */}
        {selected.size === 0 && profiles.length > 0 && (
          <p className="font-meta text-xs text-amber-600 dark:text-amber-400 mt-1" role="status">
            Projekt bez PM-a — możesz przypisać go później.
          </p>
        )}

        {/* Błąd serwera */}
        {submitError && (
          <p className="font-meta text-xs text-destructive mt-1" role="alert">
            {submitError}
          </p>
        )}

        <DialogFooter className="border-t-0 bg-transparent p-0 mt-3 flex-row justify-end gap-2">
          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={isPending}
              />
            }
          >
            Anuluj
          </DialogClose>
          <Button
            type="button"
            size="sm"
            className="rounded-full gap-1.5"
            disabled={isPending}
            onClick={handleSave}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
