'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateProjectAction } from '@/lib/actions/projects'
import type { ImplType } from '@/lib/data/projects'

// ─── Stałe ───────────────────────────────────────────────────────────────────

const IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

const IMPL_TYPE_DESCRIPTIONS: Record<ImplType, string> = {
  CRM: 'zarządzanie relacjami',
  SPO: 'SharePoint Online',
  INT: 'integracje',
  MKT: 'marketing',
  ERP: 'systemy ERP',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProjectDialogProps {
  project: {
    id: string
    name: string
    description?: string | null
    startDate: string | null
    endDate: string | null
    clientId: string
    types: ImplType[]
    pms: { id: string; fullName: string | null }[]
  }
  profiles: { id: string; full_name: string | null }[]
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function EditProjectDialog({ project, profiles }: EditProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [watchStartDate, setWatchStartDate] = useState<string>(project.startDate ?? '')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)
    setSubmitError(null)

    const fd = new FormData(e.currentTarget)

    const name = ((fd.get('name') as string | null) ?? '').trim()
    const typesRaw = fd.getAll('types') as ImplType[]
    const pmRaw = fd.get('pm_id') as string | null
    const pm_ids = pmRaw && pmRaw !== 'none' ? [pmRaw] : []
    const start_date = (fd.get('start_date') as string | null) ?? ''
    const end_dateRaw = (fd.get('end_date') as string | null) ?? ''
    const descriptionRaw = (fd.get('description') as string | null) ?? ''

    // Walidacja client-side
    if (!name) {
      setValidationError('Nazwa projektu nie może być pusta.')
      return
    }
    if (name.length > 200) {
      setValidationError('Nazwa jest za długa (max 200 znaków).')
      return
    }
    if (typesRaw.length === 0) {
      setValidationError('Wybierz co najmniej jeden typ wdrożenia.')
      return
    }
    if (!start_date) {
      setValidationError('Data startu jest wymagana.')
      return
    }
    if (start_date < '2000-01-01') {
      setValidationError('Data startu jest nierealistycznie wczesna (minimum 2000-01-01).')
      return
    }
    if (end_dateRaw && end_dateRaw < start_date) {
      setValidationError('Deadline nie może być wcześniejszy niż data startu.')
      return
    }

    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name,
        description: descriptionRaw || undefined,
        start_date,
        end_date: end_dateRaw || undefined,
        types: typesRaw,
        pm_ids,
      })

      if ('error' in result) {
        setSubmitError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  const defaultPmId = project.pms[0]?.id ?? 'none'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setValidationError(null)
          setSubmitError(null)
        } else {
          setWatchStartDate(project.startDate ?? '')
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" />
        }
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edytuj projekt
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj projekt</DialogTitle>
          <DialogDescription>
            Zmień dane projektu. Nazwa, typ wdrożenia i data startu są wymagane.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
          {/* Nazwa projektu */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-project-name">
              Nazwa projektu <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="edit-project-name"
              name="name"
              placeholder="np. Wdrożenie CRM dla Klienta ABC"
              required
              autoFocus
              maxLength={200}
              defaultValue={project.name}
            />
          </div>

          {/* Typy wdrożenia */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none mb-1.5">
              Typy wdrożenia{' '}
              <span className="text-destructive" aria-hidden="true">*</span>
              <span className="font-meta text-xs text-muted-foreground ml-2 font-normal">
                (wybierz co najmniej jeden)
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {IMPL_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm cursor-pointer transition-colors hover:border-teal/40 hover:bg-muted/60 has-[:checked]:border-teal has-[:checked]:bg-teal/5 has-[:checked]:text-teal has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1"
                >
                  <input
                    type="checkbox"
                    name="types"
                    value={type}
                    defaultChecked={project.types.includes(type)}
                    className="peer sr-only"
                  />
                  <Check
                    className="size-3.5 text-teal opacity-0 transition-opacity peer-checked:opacity-100"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[0.7rem] font-semibold">{type}</span>
                  <span className="font-meta text-xs text-muted-foreground">
                    {IMPL_TYPE_DESCRIPTIONS[type]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* PM */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-project-pm">PM prowadzący</Label>
            <Select name="pm_id" defaultValue={defaultPmId}>
              <SelectTrigger id="edit-project-pm" className="w-full">
                <SelectValue placeholder="Wybierz PM...">
                  {(value) =>
                    !value || value === 'none'
                      ? 'Bez PM (przypiszę później)'
                      : (profiles.find((p) => p.id === value)?.full_name ?? 'PM')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Bez PM (przypiszę później) —</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Daty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-project-start">
                Data startu <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="edit-project-start"
                name="start_date"
                type="date"
                min="2000-01-01"
                defaultValue={project.startDate ?? ''}
                onChange={(e) => setWatchStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-project-end">Deadline</Label>
              <Input
                id="edit-project-end"
                name="end_date"
                type="date"
                min={watchStartDate || '2000-01-01'}
                defaultValue={project.endDate ?? ''}
                aria-label="Termin zakończenia projektu (opcjonalne)"
              />
            </div>
          </div>

          {/* Opis */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-project-description">Opis</Label>
            <textarea
              id="edit-project-description"
              name="description"
              rows={3}
              placeholder="Krótki opis zakresu projektu (opcjonalne)..."
              defaultValue={project.description ?? ''}
              className="h-auto w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              aria-label="Opis projektu (opcjonalne)"
            />
          </div>

          {/* Błąd walidacji */}
          {validationError && (
            <p className="font-meta text-xs text-destructive" role="alert">
              {validationError}
            </p>
          )}

          {/* Błąd serwera */}
          {submitError && (
            <p className="font-meta text-xs text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <DialogFooter className="border-t-0 bg-transparent p-0 -mx-0 -mb-0 mt-2 flex-row justify-end gap-2">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                />
              }
            >
              Anuluj
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              className="rounded-full gap-1.5"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
