'use server'
import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateStepTemplateTitle(
  id: string,
  step_title: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()
  const title = step_title.trim()
  if (!title || title.length > 200) return { error: 'Nieprawidłowy tytuł.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('step_templates').update({ step_title: title }).eq('id', id)
  if (error) return { error: 'Nie udało się zapisać.' }
  revalidatePath('/admin/templates')
  return { ok: true }
}

export async function updateTaskTemplateTitle(
  id: string,
  task_title: string
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()
  const title = task_title.trim()
  if (!title || title.length > 300) return { error: 'Nieprawidłowy tytuł.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('step_task_templates').update({ task_title: title }).eq('id', id)
  if (error) return { error: 'Nie udało się zapisać.' }
  revalidatePath('/admin/templates')
  return { ok: true }
}

export async function updateTaskTemplateEst(
  id: string,
  est: number | null
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()
  if (est !== null && (!Number.isFinite(est) || est < 0 || est > 9999)) return { error: 'Nieprawidłowa estymacja.' }
  const supabase = createAdminClient()
  const { error } = await supabase.from('step_task_templates').update({ est }).eq('id', id)
  if (error) return { error: 'Nie udało się zapisać.' }
  revalidatePath('/admin/templates')
  return { ok: true }
}
