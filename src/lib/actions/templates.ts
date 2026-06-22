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

export async function addTaskToStep(
  stepTemplateId: string,
  task_title: string
): Promise<{ ok: true; id: string } | { error: string }> {
  await requireAdmin()
  const title = task_title.trim()
  if (!title || title.length > 300) return { error: 'Nieprawidłowy tytuł zadania.' }

  const supabase = createAdminClient()

  // Get max task_order for this step
  const { data: existing } = await supabase
    .from('step_task_templates')
    .select('task_order')
    .eq('step_template_id', stepTemplateId)
    .order('task_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.task_order ?? 0) + 1

  const { data, error } = await supabase
    .from('step_task_templates')
    .insert({
      step_template_id: stepTemplateId,
      task_title: title,
      task_order: nextOrder,
      kind: 'own',
      applies_to_types: [],
      est: null,
      is_milestone: false,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Nie udało się dodać zadania.' }
  revalidatePath('/admin/templates')
  return { ok: true, id: data.id }
}

export async function updateTaskTemplateTypes(
  id: string,
  applies_to_types: string[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin()
  const validTypes = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']
  const filtered = applies_to_types.filter((t) => validTypes.includes(t))

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('step_task_templates')
    .update({ applies_to_types: filtered })
    .eq('id', id)

  if (error) return { error: 'Nie udało się zapisać typów.' }
  revalidatePath('/admin/templates')
  return { ok: true }
}
