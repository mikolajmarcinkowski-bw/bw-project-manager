'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProjectAction } from '@/lib/actions/projects'
import type { ImplType } from '@/lib/data/projects'

const IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

const IMPL_TYPE_DESCRIPTIONS: Record<ImplType, string> = {
  CRM: 'zarządzanie relacjami',
  SPO: 'SharePoint Online',
  INT: 'integracje',
  MKT: 'marketing',
  ERP: 'systemy ERP',
}

type ActionState = { error: string } | { ok: true; id: string } | null

const initialState: ActionState = null

// Wrapper that accepts (prevState, formData) shape required by useActionState
async function createProjectFormAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = (formData.get('client_id') as string | null) ?? ''
  const name = (formData.get('name') as string | null) ?? ''
  const types = formData.getAll('types') as ImplType[]
  // pm_ids may come as single value from Select or multiple values
  const pmRaw = formData.getAll('pm_ids') as string[]
  const pm_ids = pmRaw.filter((v) => v && v !== 'none')
  const start_date = (formData.get('start_date') as string | null) ?? ''
  const end_date = (formData.get('end_date') as string | null) ?? undefined
  const description = (formData.get('description') as string | null) ?? undefined

  return createProjectAction({
    client_id,
    name,
    types,
    pm_ids,
    start_date,
    end_date: end_date || undefined,
    description: description || undefined,
  })
}

interface AddProjectFormProps {
  clients: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
  defaultClientId?: string
}

export function AddProjectForm({ clients, profiles, defaultClientId }: AddProjectFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createProjectFormAction,
    initialState
  )

  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      // Jeśli był prefill klienta: wróć do jego teczki; inaczej dashboard
      if (defaultClientId) {
        router.push(`/clients/${defaultClientId}`)
      } else {
        router.push('/dashboard')
      }
    }
  }, [state, router, defaultClientId])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Klient */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-client">
          Klient <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        {defaultClientId ? (
          <>
            <input type="hidden" name="client_id" value={defaultClientId} />
            <p className="font-meta text-sm text-muted-foreground">
              {clients.find((c) => c.id === defaultClientId)?.name ?? defaultClientId}
            </p>
          </>
        ) : (
          <Select name="client_id" required>
            <SelectTrigger id="project-client" className="w-full">
              <SelectValue placeholder="Wybierz klienta..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Nazwa projektu */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name">
          Nazwa projektu <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="project-name"
          name="name"
          placeholder="np. Wdrożenie CRM dla Klienta ABC"
          required
          autoFocus={!defaultClientId}
        />
      </div>

      {/* Typy wdrożenia (multiselect przez checkboxy) */}
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
                className="sr-only"
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
        <Label htmlFor="project-pm">
          Kierownik projektu (PM)
        </Label>
        <Select name="pm_ids" defaultValue="none">
          <SelectTrigger id="project-pm" className="w-full">
            <SelectValue placeholder="Wybierz PM..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Bez PM (przypiszę później) —</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Daty: start i deadline */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-start">
            Data startu <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="project-start"
            name="start_date"
            type="date"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-end">Deadline</Label>
          <Input
            id="project-end"
            name="end_date"
            type="date"
            aria-label="Termin zakończenia projektu (opcjonalne)"
          />
        </div>
      </div>

      {/* Opis */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-description">Opis</Label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          placeholder="Krótki opis zakresu projektu (opcjonalne)..."
          className="h-auto w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          aria-label="Opis projektu (opcjonalne)"
        />
      </div>

      {/* Blad globalny */}
      {state && 'error' in state && (
        <p className="font-meta text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {/* Akcje */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => router.back()}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          size="sm"
          className="rounded-full gap-1.5"
          disabled={isPending}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Utwórz projekt
        </Button>
      </div>
    </form>
  )
}
