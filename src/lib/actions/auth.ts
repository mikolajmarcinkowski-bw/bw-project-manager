'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Wylogowuje uzytkownika: konczy sesje Supabase i przekierowuje na /login.
 * Reuzywalna w dowolnym Server Action lub komponentcie serwerowym.
 */
export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
