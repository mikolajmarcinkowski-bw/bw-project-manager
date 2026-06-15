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
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole) ?? 'user',
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
