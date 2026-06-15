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
    return { error: 'Podaj adres e-mail i haslo.' }
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
      return { error: 'Nieprawidlowy adres e-mail lub haslo.' }
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Konto nie zostalo jeszcze zweryfikowane. Sprawdz skrzynke e-mail.' }
    }
    return { error: 'Nie mozna sie zalogowac. Sprobuj ponownie.' }
  }

  // redirect() throws NEXT_REDIRECT -- must be outside try/catch
  redirect(redirectTo)
}
