'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldOff, Pencil, Check, X, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  createSpecialist,
  updateSpecialistName,
  toggleSpecialistActive,
} from '@/lib/actions/specialists'

// ---------------------------------------------------------------------------
// EditSpecialistNameControl — inline edycja imienia i nazwiska konsultanta
// ---------------------------------------------------------------------------
export function EditSpecialistNameControl({
  specialistId,
  currentName,
}: {
  specialistId: string
  currentName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentName ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setValue(currentName ?? '')
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateSpecialistName(specialistId, value)
      if ('error' in result) {
        setError(result.error)
      } else {
        setIsEditing(false)
        router.refresh()
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="font-heading font-medium text-foreground text-sm">
          {currentName ?? '—'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          onClick={handleEdit}
          aria-label="Edytuj imię i nazwisko"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-sm w-44"
          autoFocus
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          aria-label="Imię i nazwisko konsultanta"
          disabled={isPending}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-teal hover:bg-teal/10"
          onClick={handleSave}
          disabled={isPending}
          aria-label="Zapisz"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-muted-foreground hover:bg-muted"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Anuluj"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToggleSpecialistButton — aktywuj / dezaktywuj konsultanta
// ---------------------------------------------------------------------------
export function ToggleSpecialistButton({
  specialistId,
  isActive,
}: {
  specialistId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleSpecialistActive(specialistId, !isActive)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 gap-1.5 rounded-md px-2 text-xs font-medium ${
          isActive
            ? 'text-status-off hover:bg-status-off/10'
            : 'text-teal hover:bg-teal/10'
        }`}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isActive ? (
          <>
            <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
            Dezaktywuj
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Aktywuj
          </>
        )}
      </Button>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddSpecialistDialog — dialog dodawania nowego konsultanta do puli
// ---------------------------------------------------------------------------
export function AddSpecialistDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Wyczyść formularz przy zamknięciu
      setName('')
      setError(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createSpecialist(name)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        setName('')
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children as React.ReactElement} />

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nowy konsultant</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          {/* Imię i nazwisko */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="specialist-name">
              Imię i nazwisko{' '}
              <span className="text-status-off" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="specialist-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Anna Kowalska"
              required
              maxLength={200}
              autoFocus
              autoComplete="off"
              disabled={isPending}
            />
          </div>

          {/* Błąd */}
          {error && (
            <p className="font-meta text-xs text-status-off" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="border-t-0 bg-transparent p-0 -mx-0 -mb-0 mt-2 flex-row justify-end gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm" className="rounded-full" />
              }
            >
              Anuluj
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              className="rounded-full gap-1.5 bg-teal text-white hover:bg-teal-strong"
              disabled={isPending || !name.trim()}
            >
              {isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              )}
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Dodaj konsultanta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
