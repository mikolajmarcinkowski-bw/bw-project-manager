import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type UserRole = 'dev_admin' | 'admin' | 'user'

export type SessionUser = {
  id: string
  email: string | null
  fullName: string | null
  role: UserRole
  isTester: boolean
}

/**
 * Warstwa dostępu do danych (DAL) — centralne sprawdzanie sesji + roli.
 * Wzorzec z docs Next 16: weryfikacja blisko źródła danych, nie w layoutach
 * (layouty nie re-renderują się przy nawigacji). `cache` memoizuje w obrębie renderu.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_tester, is_active')
    .eq('id', user.id)
    .single()

  // H-1: konto dezaktywowane przez admina — wymuś wylogowanie
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    return null
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole) ?? 'user',
    isTester: profile?.is_tester ?? false,
  }
})

/** Wymusza zalogowanie — przekierowuje na /login gdy brak sesji. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
})

/** Wymusza rolę admin/dev_admin — w przeciwnym razie /forbidden. */
export const requireAdmin = cache(async (): Promise<SessionUser> => {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'dev_admin') redirect('/forbidden')
  return user
})
