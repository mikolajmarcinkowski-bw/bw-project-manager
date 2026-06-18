'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/dal'
import { revalidatePath } from 'next/cache'

// Pomocnicze: pobierz rolę celu — chroni dev_admina przed degradacją przez admina
async function getTargetRole(userId: string): Promise<string | null> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('profiles').select('role').eq('id', userId).single()
  return data?.role ?? null
}

// Pomocnicze: log do activity_log (nieblokujący)
async function logAdminAction(actorId: string, action: string, targetId: string, before: unknown, after: unknown) {
  const adminClient = createAdminClient()
  adminClient.from('activity_log').insert({
    entity: 'user', entity_id: targetId,
    action, actor_id: actorId,
    before, after,
  }).then(({ error }) => { if (error) console.error('[logAdminAction] failed:', error) })
}

// ---------------------------------------------------------------------------
// Tworzenie konta użytkownika (Admin API)
// ---------------------------------------------------------------------------
export async function createUserAccount(input: {
  email: string
  full_name: string
  role: 'admin' | 'user'
  is_tester?: boolean
  password: string
}): Promise<{ ok: true; user_id: string } | { error: string }> {
  await requireAdmin()

  const email = (input.email ?? '').trim().toLowerCase()
  const full_name = (input.full_name ?? '').trim()
  const password = input.password ?? ''

  if (!email) return { error: 'Adres e-mail jest wymagany.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Nieprawidłowy format adresu e-mail.' }
  if (!full_name) return { error: 'Imię i nazwisko jest wymagane.' }
  if (password.length < 8) return { error: 'Hasło musi mieć co najmniej 8 znaków.' }
  if (!['admin', 'user'].includes(input.role)) return { error: 'Nieprawidłowa rola.' }

  const adminClient = createAdminClient()

  // 1) Utwórz konto w Auth (email_confirm: true — konto od razu aktywne)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError || !authData.user) {
    console.error('[createUserAccount] auth.admin.createUser failed:', authError)
    return { error: authError?.message ?? 'Nie udało się utworzyć konta. Spróbuj ponownie.' }
  }

  const userId = authData.user.id

  // 2) Trigger handle_new_user zaszywa rolę 'user' — aktualizujemy profil z docelową rolą.
  // service_role context: auth.uid() IS NULL → protect_profile_privileges przepuszcza zmianę.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      full_name,
      role: input.role,
      is_tester: input.is_tester ?? false,
    })
    .eq('id', userId)

  if (profileError) {
    console.error('[createUserAccount] profile update failed:', profileError)
    // Cofnij — usuń konto Auth
    await adminClient.auth.admin.deleteUser(userId)
    return { error: 'Nie udało się ustawić roli. Konto nie zostało utworzone.' }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/team')

  return { ok: true, user_id: userId }
}

// ---------------------------------------------------------------------------
// Zmiana roli użytkownika
// ---------------------------------------------------------------------------
export async function changeUserRole(
  userId: string,
  role: 'admin' | 'user'
): Promise<{ ok: true } | { error: string }> {
  const caller = await requireAdmin()

  if (!userId) return { error: 'Brak identyfikatora użytkownika.' }
  if (!['admin', 'user'].includes(role)) return { error: 'Nieprawidłowa rola.' }
  if (userId === caller.id) return { error: 'Nie możesz zmienić własnej roli.' }

  // M-1: Chroń konta dev_admin — tylko dev_admin może modyfikować dev_admina
  const targetRole = await getTargetRole(userId)
  if (targetRole === 'dev_admin' && caller.role !== 'dev_admin') {
    return { error: 'Tylko super-admin może modyfikować konta dev_admin.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId)

  if (error) {
    console.error('[changeUserRole] update failed:', error)
    return { error: 'Nie udało się zmienić roli. Spróbuj ponownie.' }
  }

  await logAdminAction(caller.id, 'change_user_role', userId, { role: targetRole }, { role })
  revalidatePath('/admin/users')
  revalidatePath('/admin/team')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Dezaktywacja / aktywacja konta
// ---------------------------------------------------------------------------
export async function toggleUserActive(
  userId: string,
  active: boolean
): Promise<{ ok: true } | { error: string }> {
  const caller = await requireAdmin()

  if (!userId) return { error: 'Brak identyfikatora użytkownika.' }
  if (userId === caller.id) return { error: 'Nie możesz dezaktywować własnego konta.' }

  // M-1: Chroń konta dev_admin
  const targetRole = await getTargetRole(userId)
  if (targetRole === 'dev_admin' && caller.role !== 'dev_admin') {
    return { error: 'Tylko super-admin może dezaktywować konta dev_admin.' }
  }

  const adminClient = createAdminClient()

  // H-1: Supabase Auth ban — faktycznie blokuje logowanie i unieważnia tokeny
  if (!active) {
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: '876000h' }).catch(() => {})
  } else {
    await adminClient.auth.admin.updateUserById(userId, { ban_duration: 'none' }).catch(() => {})
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ is_active: active })
    .eq('id', userId)

  if (profileError) {
    console.error('[toggleUserActive] profile update failed:', profileError)
    return { error: 'Nie udało się zmienić statusu konta. Spróbuj ponownie.' }
  }

  await logAdminAction(caller.id, active ? 'activate_user' : 'deactivate_user', userId, { is_active: !active }, { is_active: active })
  revalidatePath('/admin/users')
  revalidatePath('/admin/team')
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Edycja pełnego imienia i nazwiska
// ---------------------------------------------------------------------------
export async function updateUserFullName(
  userId: string,
  full_name: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()

  if (!userId) return { error: 'Brak identyfikatora użytkownika.' }
  const name = (full_name ?? '').trim()
  if (!name) return { error: 'Imię i nazwisko nie może być puste.' }
  if (name.length > 200) return { error: 'Imię i nazwisko jest za długie (max 200 znaków).' }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('profiles')
    .update({ full_name: name })
    .eq('id', userId)

  if (error) {
    console.error('[updateUserFullName] update failed:', error)
    return { error: 'Nie udało się zaktualizować imienia i nazwiska.' }
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin/team')

  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reset hasła — wysyłamy e-mail z linkiem do resetu
// ---------------------------------------------------------------------------
export async function resetUserPassword(
  userId: string
): Promise<{ ok: true } | { error: string }> {
  const caller = await requireAdmin()

  if (!userId) return { error: 'Brak identyfikatora użytkownika.' }

  // M-1: Chroń konta dev_admin
  const targetRole = await getTargetRole(userId)
  if (targetRole === 'dev_admin' && caller.role !== 'dev_admin') {
    return { error: 'Tylko super-admin może resetować hasło konta dev_admin.' }
  }

  const adminClient = createAdminClient()

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
  if (userError || !userData.user?.email) {
    return { error: 'Nie znaleziono użytkownika.' }
  }

  const { error } = await adminClient.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'vercel.app') ?? ''}/login`,
  })

  if (error) {
    console.error('[resetUserPassword] reset failed:', error)
    return { error: 'Nie udało się wysłać linku do resetu hasła.' }
  }

  await logAdminAction(caller.id, 'reset_password', userId, null, { email_sent: userData.user.email })
  return { ok: true }
}
