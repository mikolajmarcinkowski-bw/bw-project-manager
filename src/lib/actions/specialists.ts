'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/dal'
import { revalidatePath } from 'next/cache'

export async function createSpecialist(
  full_name: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()

  const name = (full_name ?? '').trim()
  if (!name) return { error: 'Imię i nazwisko jest wymagane.' }
  if (name.length > 200) return { error: 'Imię i nazwisko jest za długie (max 200 znaków).' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('team_members')
    .insert({ full_name: name })

  if (error) {
    console.error('[createSpecialist] insert failed:', error)
    return { error: 'Nie udało się dodać konsultanta. Spróbuj ponownie.' }
  }

  revalidatePath('/admin/team')
  return { ok: true }
}

export async function updateSpecialistName(
  id: string,
  full_name: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()

  if (!id) return { error: 'Brak identyfikatora.' }
  const name = (full_name ?? '').trim()
  if (!name) return { error: 'Imię i nazwisko nie może być puste.' }
  if (name.length > 200) return { error: 'Imię i nazwisko jest za długie (max 200 znaków).' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('team_members')
    .update({ full_name: name })
    .eq('id', id)

  if (error) {
    console.error('[updateSpecialistName] update failed:', error)
    return { error: 'Nie udało się zaktualizować nazwy. Spróbuj ponownie.' }
  }

  revalidatePath('/admin/team')
  return { ok: true }
}

export async function toggleSpecialistActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()

  if (!id) return { error: 'Brak identyfikatora.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('team_members')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) {
    console.error('[toggleSpecialistActive] update failed:', error)
    return { error: 'Nie udało się zmienić statusu. Spróbuj ponownie.' }
  }

  revalidatePath('/admin/team')
  return { ok: true }
}
