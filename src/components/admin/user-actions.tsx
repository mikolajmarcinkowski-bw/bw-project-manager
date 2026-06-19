'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ShieldOff, RotateCcw, KeyRound, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { changeUserRole, toggleUserActive, resetUserPassword, updateUserFullName } from '@/lib/actions/admin'

// ---------------------------------------------------------------------------
// UserRoleSelect — dropdown zmiany roli w wierszu tabeli
// ---------------------------------------------------------------------------
export function UserRoleSelect({ userId, currentRole, isSelf }: {
  userId: string
  currentRole: 'admin' | 'user' | 'dev_admin'
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // dev_admin nie może być zmieniony przez ten UI
  if (currentRole === 'dev_admin') {
    return (
      <span className="font-meta text-xs text-muted-foreground italic">dev_admin</span>
    )
  }

  async function handleChange(value: string | null) {
    if (!value) return
    setError(null)
    startTransition(async () => {
      const result = await changeUserRole(userId, value as 'admin' | 'user')
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        defaultValue={currentRole}
        onValueChange={handleChange}
        disabled={isPending || isSelf}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">Użytkownik</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">{error}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToggleActiveButton — aktywuj / dezaktywuj konto
// ---------------------------------------------------------------------------
export function ToggleActiveButton({ userId, isActive, isSelf }: {
  userId: string
  isActive: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function executeToggle() {
    setError(null)
    startTransition(async () => {
      const result = await toggleUserActive(userId, !isActive)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleClick() {
    if (isActive) {
      // Dezaktywacja — pokaż dialog potwierdzenia
      setConfirmOpen(true)
    } else {
      // Aktywacja — bezpośrednio
      executeToggle()
    }
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
        onClick={handleClick}
        disabled={isPending || isSelf}
        title={isSelf ? 'Nie możesz dezaktywować własnego konta' : undefined}
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
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">{error}</p>
      )}

      {/* Dialog potwierdzenia dezaktywacji */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Dezaktywuj konto?</DialogTitle>
            <DialogDescription>
              Użytkownik straci dostęp natychmiast. Można aktywować ponownie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button
              size="sm"
              className="bg-status-off text-white hover:bg-status-off/90"
              onClick={() => { setConfirmOpen(false); executeToggle() }}
              disabled={isPending}
            >
              Dezaktywuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ResetPasswordButton — wyślij link do resetu hasła
// ---------------------------------------------------------------------------
export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleReset() {
    setStatus('idle')
    setErrorMsg(null)
    startTransition(async () => {
      const result = await resetUserPassword(userId)
      if ('error' in result) {
        setStatus('error')
        setErrorMsg(result.error)
      } else {
        setStatus('ok')
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted"
        onClick={handleReset}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <RotateCcw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Wysyłam...
          </>
        ) : (
          <>
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            Reset hasła
          </>
        )}
      </Button>
      {status === 'ok' && (
        <p className="font-meta text-[0.68rem] text-teal" role="status">Link wysłany.</p>
      )}
      {status === 'error' && errorMsg && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">{errorMsg}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditFullNameControl — inline edycja imienia i nazwiska (A3)
// ---------------------------------------------------------------------------
export function EditFullNameControl({ userId, currentName }: {
  userId: string
  currentName: string | null
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
      const result = await updateUserFullName(userId, value)
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
        <span className="font-medium text-foreground text-sm">
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          aria-label="Imię i nazwisko"
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
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">{error}</p>
      )}
    </div>
  )
}
