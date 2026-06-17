'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClientAction } from '@/lib/actions/clients'

type ActionState = { error: string } | { ok: true; id: string } | null

const initialState: ActionState = null

// Wrapper that accepts (prevState, formData) shape required by useActionState
async function createClientFormAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = (formData.get('name') as string | null) ?? ''
  const nip = (formData.get('nip') as string | null) ?? undefined
  const hubspot_url = (formData.get('hubspot_url') as string | null) ?? undefined
  return createClientAction({ name, nip: nip || undefined, hubspot_url: hubspot_url || undefined })
}

export function AddClientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nipError, setNipError] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createClientFormAction,
    initialState
  )

  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  function handleNipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!raw) {
      setNipError(null)
      return
    }
    const digits = raw.replace(/[\s-]/g, '')
    if (!/^\d{10}$/.test(digits)) {
      setNipError('NIP musi składać się z 10 cyfr.')
    } else {
      setNipError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setNipError(null) }}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="gap-1.5 rounded-full" />
        }
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Dodaj klienta
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy klient</DialogTitle>
          <DialogDescription>
            Wypełnij dane klienta. Nazwa jest wymagana.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-name">
              Nazwa klienta <span className="text-status-off" aria-hidden="true">*</span>
            </Label>
            <Input
              id="client-name"
              name="name"
              placeholder="np. Klient ABC Sp. z o.o."
              required
              autoFocus
              aria-describedby={state && 'error' in state ? 'client-form-error' : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-nip">NIP</Label>
            <Input
              id="client-nip"
              name="nip"
              placeholder="np. 1234567890"
              aria-label="NIP (opcjonalne)"
              aria-describedby={nipError ? 'client-nip-error' : undefined}
              onChange={handleNipChange}
            />
            {nipError && (
              <p id="client-nip-error" className="font-meta text-xs text-status-off" role="alert">
                {nipError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="client-hubspot">Link HubSpot</Label>
            <Input
              id="client-hubspot"
              name="hubspot_url"
              type="url"
              placeholder="https://app.hubspot.com/contacts/..."
              aria-label="Link do rekordu w HubSpot (opcjonalne)"
            />
          </div>

          {state && 'error' in state && (
            <p
              id="client-form-error"
              className="font-meta text-xs text-status-off"
              role="alert"
            >
              {state.error}
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
              disabled={isPending || !!nipError}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Utwórz klienta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
