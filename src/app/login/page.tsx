'use client'

import { Suspense, useActionState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, type LoginState } from './actions'
import { Button } from '@/components/ui/button'

const initialState: LoginState = undefined

// useSearchParams() wymaga otoczki Suspense przy prerenderze (Next 16).
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? ''

  const [state, action, pending] = useActionState(login, initialState)

  // Put focus on password field when error appears
  const passwordRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (state && 'error' in state && state.error) {
      passwordRef.current?.focus()
    }
  }, [state])

  const hasError = state && 'error' in state && state.error

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div
        className="w-full max-w-sm rounded-[10px] bg-card shadow-whisper border border-border px-8 py-10 flex flex-col gap-7"
      >
        {/* Logotyp */}
        <div className="flex flex-col gap-1 items-center text-center">
          <span
            className="font-sans font-semibold text-xl tracking-tight"
            style={{ color: 'var(--teal)' }}
          >
            BW
          </span>
          <h1 className="font-sans font-semibold text-lg leading-tight text-foreground">
            Project Manager
          </h1>
          <p className="font-meta text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
            Narzedzie wewnetrzne
          </p>
        </div>

        {/* Formularz */}
        <form action={action} noValidate className="flex flex-col gap-5">
          {/* Ukryte pole redirectTo */}
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="font-meta text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Adres e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              required
              aria-invalid={hasError ? true : undefined}
              className="
                h-9 w-full rounded-md border border-border bg-input
                px-3 text-sm text-foreground placeholder:text-muted-foreground
                outline-none
                focus:border-ring focus:ring-2 focus:ring-ring/30
                transition-shadow duration-150
                aria-invalid:border-destructive aria-invalid:ring-destructive/20
              "
              placeholder="twoje@businessweb.pl"
            />
          </div>

          {/* Haslo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="font-meta text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Haslo
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              ref={passwordRef}
              aria-invalid={hasError ? true : undefined}
              className="
                h-9 w-full rounded-md border border-border bg-input
                px-3 text-sm text-foreground placeholder:text-muted-foreground
                outline-none
                focus:border-ring focus:ring-2 focus:ring-ring/30
                transition-shadow duration-150
                aria-invalid:border-destructive aria-invalid:ring-destructive/20
              "
              placeholder="••••••••"
            />
          </div>

          {/* Komunikat bledu */}
          {hasError && (
            <p
              role="alert"
              className="text-sm text-destructive leading-snug -mt-1"
            >
              {state.error}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-full h-10 text-sm font-semibold mt-1"
          >
            {pending ? 'Logowanie...' : 'Zaloguj sie'}
          </Button>
        </form>
      </div>
    </div>
  )
}
