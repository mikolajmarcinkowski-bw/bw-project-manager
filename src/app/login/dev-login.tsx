'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, User } from 'lucide-react'
import { devLogin } from './actions'
import { Button } from '@/components/ui/button'

// Obejście logowania — renderowane TYLKO lokalnie (gate serwerowy w page.tsx).
// Klik = wejście na konto dev bez wpisywania hasła. W produkcji nie istnieje.
export function DevLogin() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function enter(role: 'admin' | 'user') {
    setError(null)
    startTransition(async () => {
      const res = await devLogin(role)
      // Sukces = redirect (rzuca NEXT_REDIRECT, nie wraca). Tu trafia tylko błąd.
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-border" />
        <span className="font-meta text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          Tylko lokalnie · obejście logowania
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => enter('admin')}
          className="rounded-full h-9 text-xs font-medium gap-1.5"
        >
          <ShieldCheck className="size-3.5 text-teal" aria-hidden />
          Wejdź jako Admin
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => enter('user')}
          className="rounded-full h-9 text-xs font-medium gap-1.5"
        >
          <User className="size-3.5 text-teal" aria-hidden />
          Wejdź jako User
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive leading-snug text-center">
          {error}
        </p>
      )}
    </div>
  )
}
