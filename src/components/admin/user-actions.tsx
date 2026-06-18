'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ShieldCheck, ShieldOff, RotateCcw, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { changeUserRole, toggleUserActive, resetUserPassword } from '@/lib/actions/admin'

interface UserActionsProps {
  userId: string
  currentRole: 'admin' | 'user' | 'dev_admin'
  isActive: boolean
  /** Zabezpieczenie: nie pozwól adminowi zablokować własnego konta */
  isSelf: boolean
}

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

export function ToggleActiveButton({ userId, isActive, isSelf }: {
  userId: string
  isActive: boolean
  isSelf: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
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
    </div>
  )
}

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

// Nie używany osobno — eksport pomocniczy
export { MoreHorizontal }
