'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2 } from 'lucide-react'
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
import { updateClientAction } from '@/lib/actions/clients'

interface EditClientDialogProps {
  client: {
    id: string
    name: string
    nip: string | null
    hubspot_url: string | null
  }
}

type ActionState = { error: string } | { ok: true } | null

const initialState: ActionState = null

export function EditClientDialog({ client }: EditClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nipError, setNipError] = useState<string | null>(null)

  // Wrapper closes over client.id — must be defined inside component
  async function updateClientFormAction(
    _prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> {
    const name = (formData.get('name') as string | null) ?? ''
    const nip = (formData.get('nip') as string | null) ?? undefined
    const hubspot_url = (formData.get('hubspot_url') as string | null) ?? undefined
    return updateClientAction(client.id, {
      name,
      nip: nip || undefined,
      hubspot_url: hubspot_url || undefined,
    })
  }

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateClientFormAction,
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setNipError(null)
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" />
        }
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edytuj klienta
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj klienta</DialogTitle>
          <DialogDescription>
            Zmień dane klienta. Nazwa jest wymagana.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-client-name">
              Nazwa klienta <span className="text-status-off" aria-hidden="true">*</span>
            </Label>
            <Input
              id="edit-client-name"
              name="name"
              placeholder="np. Klient ABC Sp. z o.o."
              required
              autoFocus
              defaultValue={client.name}
              aria-describedby={state && 'error' in state ? 'edit-client-form-error' : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-client-nip">NIP</Label>
            <Input
              id="edit-client-nip"
              name="nip"
              placeholder="np. 1234567890"
              aria-label="NIP (opcjonalne)"
              defaultValue={client.nip ?? ''}
              aria-describedby={nipError ? 'edit-client-nip-error' : undefined}
              onChange={handleNipChange}
            />
            {nipError && (
              <p id="edit-client-nip-error" className="font-meta text-xs text-status-off" role="alert">
                {nipError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-client-hubspot">Link HubSpot</Label>
            <Input
              id="edit-client-hubspot"
              name="hubspot_url"
              type="url"
              placeholder="https://app.hubspot.com/contacts/..."
              aria-label="Link do rekordu w HubSpot (opcjonalne)"
              defaultValue={client.hubspot_url ?? ''}
            />
          </div>

          {state && 'error' in state && (
            <p
              id="edit-client-form-error"
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
              Zapisz zmiany
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
