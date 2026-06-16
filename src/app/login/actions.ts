'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState =
  | { error: string }
  | { error: null }
  | undefined

function isSafeRedirect(url: string | null): url is string {
  // Tylko ścieżki wewnętrzne. Odrzuca absolutne, protocol-relative (//) i bypass backslashem (/\ → //).
  return (
    typeof url === 'string' &&
    url.startsWith('/') &&
    !url.startsWith('//') &&
    !url.startsWith('/\\')
  )
}

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const redirectToRaw = formData.get('redirectTo') as string | null
  const redirectTo = isSafeRedirect(redirectToRaw) ? redirectToRaw : '/dashboard'

  if (!email || !password) {
    return { error: 'Podaj adres e-mail i hasło.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Map Supabase English errors to Polish
    const code = error.code ?? ''
    if (
      code === 'invalid_credentials' ||
      error.message.includes('Invalid login credentials')
    ) {
      return { error: 'Nieprawidłowy adres e-mail lub hasło.' }
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Konto nie zostało jeszcze zweryfikowane. Sprawdź skrzynkę e-mail.' }
    }
    return { error: 'Nie można się zalogować. Spróbuj ponownie.' }
  }

  // redirect() throws NEXT_REDIRECT -- must be outside try/catch
  redirect(redirectTo)
}

// ── Obejście logowania (TYLKO lokalnie / development) ───────────────────────
// Loguje na konto dev (admin lub user) bez wpisywania hasła. Twarda bramka:
// w produkcji (i na preview Vercela, gdzie NODE_ENV='production') odmawia
// i NIE czyta żadnych creds. Dane kont wyłącznie z .env.local (nigdy w Vercel).
export type DevRole = 'admin' | 'user'

export async function devLogin(role: DevRole): Promise<{ error: string } | void> {
  // Fail-closed: pozwól WYŁĄCZNIE w trybie development. Każda inna wartość
  // (production, preview, test, brak zmiennej) → odmowa, przed odczytem creds.
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'Obejście logowania jest dostępne tylko lokalnie.' }
  }

  const email =
    role === 'admin' ? process.env.DEV_ADMIN_EMAIL : process.env.DEV_USER_EMAIL
  const password =
    role === 'admin' ? process.env.DEV_ADMIN_PASS : process.env.DEV_USER_PASS

  if (!email || !password) {
    return {
      error: 'Brak danych konta dev w .env.local (DEV_ADMIN_*/DEV_USER_*).',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Nie udało się zalogować na konto dev. Sprawdź .env.local.' }
  }

  // redirect() rzuca NEXT_REDIRECT -- poza obsługą błędu.
  // Skrót dev: zawsze na /dashboard (świadomie pomijamy redirectTo).
  redirect('/dashboard')
}
