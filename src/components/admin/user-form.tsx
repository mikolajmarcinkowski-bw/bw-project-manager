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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createUserAccount } from '@/lib/actions/admin'

type ActionState = { ok: true; user_id: string } | { error: string } | null

const initialState: ActionState = null

async function createUserFormAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string | null) ?? ''
  const full_name = (formData.get('full_name') as string | null) ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const role = ((formData.get('role') as string | null) ?? 'user') as 'admin' | 'user'
  const is_tester = formData.get('is_tester') === 'on'

  return createUserAccount({ email, full_name, password, role, is_tester })
}

export function AddUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createUserFormAction,
    initialState
  )

  useEffect(() => {
    if (state && 'ok' in state && state.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" size="sm" className="gap-1.5 rounded-full" />
        }
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Dodaj użytkownika
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy użytkownik</DialogTitle>
          <DialogDescription>
            Utwórz konto dla członka zespołu. Hasło tymczasowe — użytkownik zmienia je przy pierwszym logowaniu.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 mt-2">
          {/* E-mail */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">
              Adres e-mail <span className="text-status-off" aria-hidden="true">*</span>
            </Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              placeholder="np. jan.kowalski@businessweb.pl"
              required
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Imię i nazwisko */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-fullname">
              Imię i nazwisko <span className="text-status-off" aria-hidden="true">*</span>
            </Label>
            <Input
              id="user-fullname"
              name="full_name"
              placeholder="np. Jan Kowalski"
              required
              autoComplete="name"
            />
          </div>

          {/* Hasło tymczasowe */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">
              Hasło tymczasowe <span className="text-status-off" aria-hidden="true">*</span>
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              placeholder="Min. 8 znaków"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {/* Rola */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-role">Rola</Label>
            <Select name="role" defaultValue="user">
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Użytkownik (PM)</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tester */}
          <div className="flex items-center gap-2">
            <input
              id="user-tester"
              name="is_tester"
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-teal"
            />
            <Label htmlFor="user-tester" className="cursor-pointer font-normal">
              Konto testerskie (widoczność narzędzi inspekcji)
            </Label>
          </div>

          {/* Błąd */}
          {state && 'error' in state && (
            <p className="font-meta text-xs text-status-off" role="alert">
              {state.error}
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
              className="rounded-full gap-1.5"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Utwórz konto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
