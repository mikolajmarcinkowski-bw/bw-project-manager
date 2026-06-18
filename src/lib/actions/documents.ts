'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { RateType, CrType, CrImpact, CrStatus } from '@/lib/data/projects'

// ─── Budget settings ──────────────────────────────────────────────────────────

export async function setBudgetSettings(
  projectId: string,
  settings: {
    rate_k: number
    rate_w: number
    rate_d: number
    buffer_pct?: number
    pm_overhead_pct?: number
    budget_max?: number
  }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { error } = await supabase
    .from('budget_settings')
    .upsert(
      {
        project_id: projectId,
        rate_k: settings.rate_k,
        rate_w: settings.rate_w,
        rate_d: settings.rate_d,
        buffer_pct: settings.buffer_pct ?? 0,
        pm_overhead_pct: settings.pm_overhead_pct ?? 0,
        budget_max: settings.budget_max ?? null,
      },
      { onConflict: 'project_id' }
    )

  if (error) {
    console.error('[setBudgetSettings]:', error)
    return { error: 'Nie udało się zapisać ustawień budżetu.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true }
}

// ─── Budget line — add ────────────────────────────────────────────────────────

export async function addBudgetLine(
  projectId: string,
  data: {
    phase: string
    rate_type: RateType
    est_h: number
    description?: string
    task_id?: string
  }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: row, error } = await supabase
    .from('budget_lines')
    .insert({
      project_id: projectId,
      phase: data.phase,
      rate_type: data.rate_type,
      est_h: data.est_h,
      actual_h: 0,
      description: data.description ?? null,
      task_id: data.task_id ?? null,
    })
    .select('id')
    .single()

  if (error || !row) {
    console.error('[addBudgetLine]:', error)
    return { error: 'Nie udało się dodać linii budżetowej.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: row.id }
}

// ─── Budget line — update actual hours ───────────────────────────────────────

export async function updateBudgetLineActual(
  lineId: string,
  actual_h: number
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: line, error: fetchErr } = await supabase
    .from('budget_lines')
    .select('project_id')
    .eq('id', lineId)
    .single()

  if (fetchErr || !line) return { error: 'Nie znaleziono linii budżetowej.' }

  const { error } = await supabase
    .from('budget_lines')
    .update({ actual_h })
    .eq('id', lineId)

  if (error) {
    console.error('[updateBudgetLineActual]:', error)
    return { error: 'Nie udało się zaktualizować godzin.' }
  }

  revalidatePath(`/projects/${line.project_id}`)
  return { ok: true }
}

// ─── Budget line — delete ─────────────────────────────────────────────────────

export async function deleteBudgetLine(
  lineId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: line, error: fetchErr } = await supabase
    .from('budget_lines')
    .select('project_id')
    .eq('id', lineId)
    .single()

  if (fetchErr || !line) return { error: 'Nie znaleziono linii budżetowej.' }

  const { error } = await supabase
    .from('budget_lines')
    .delete()
    .eq('id', lineId)

  if (error) {
    console.error('[deleteBudgetLine]:', error)
    return { error: 'Nie udało się usunąć linii budżetowej.' }
  }

  revalidatePath(`/projects/${line.project_id}`)
  return { ok: true }
}

// ─── Change Request — types ───────────────────────────────────────────────────

export interface CrData {
  title: string
  cr_number?: string
  cr_type: CrType
  description?: string
  current_state?: string
  desired_state?: string
  business_rationale?: string
  impact_level?: CrImpact
  impact_hours?: number
  impact_cost?: number
  schedule_impact?: string
  submitted_date?: string
  status?: CrStatus
  implementation_plan?: string
  notes?: string
}

// ─── Change Request — add ─────────────────────────────────────────────────────

export async function addChangeRequest(
  projectId: string,
  data: CrData
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: row, error } = await supabase
    .from('change_requests')
    .insert({
      project_id: projectId,
      title: data.title,
      cr_number: data.cr_number ?? null,
      cr_type: data.cr_type,
      description: data.description ?? null,
      current_state: data.current_state ?? null,
      desired_state: data.desired_state ?? null,
      business_rationale: data.business_rationale ?? null,
      impact_level: data.impact_level ?? null,
      impact_hours: data.impact_hours ?? null,
      impact_cost: data.impact_cost ?? null,
      schedule_impact: data.schedule_impact ?? null,
      submitted_date: data.submitted_date ?? new Date().toISOString().slice(0, 10),
      status: data.status ?? 'draft',
      implementation_plan: data.implementation_plan ?? null,
      notes: data.notes ?? null,
      submitted_by: user.id,
    })
    .select('id')
    .single()

  if (error || !row) {
    console.error('[addChangeRequest]:', error)
    return { error: 'Nie udało się dodać Change Request.' }
  }

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: row.id }
}

// ─── Change Request — update ──────────────────────────────────────────────────

export async function updateChangeRequest(
  crId: string,
  data: Partial<CrData>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: existing, error: fetchErr } = await supabase
    .from('change_requests')
    .select('project_id')
    .eq('id', crId)
    .single()

  if (fetchErr || !existing) return { error: 'Nie znaleziono Change Request.' }

  const updatePayload: Record<string, unknown> = {}
  if (data.title !== undefined) updatePayload.title = data.title
  if (data.cr_number !== undefined) updatePayload.cr_number = data.cr_number
  if (data.cr_type !== undefined) updatePayload.cr_type = data.cr_type
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.current_state !== undefined) updatePayload.current_state = data.current_state
  if (data.desired_state !== undefined) updatePayload.desired_state = data.desired_state
  if (data.business_rationale !== undefined) updatePayload.business_rationale = data.business_rationale
  if (data.impact_level !== undefined) updatePayload.impact_level = data.impact_level
  if (data.impact_hours !== undefined) updatePayload.impact_hours = data.impact_hours
  if (data.impact_cost !== undefined) updatePayload.impact_cost = data.impact_cost
  if (data.schedule_impact !== undefined) updatePayload.schedule_impact = data.schedule_impact
  if (data.submitted_date !== undefined) updatePayload.submitted_date = data.submitted_date
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.implementation_plan !== undefined) updatePayload.implementation_plan = data.implementation_plan
  if (data.notes !== undefined) updatePayload.notes = data.notes

  const { error } = await supabase
    .from('change_requests')
    .update(updatePayload)
    .eq('id', crId)

  if (error) {
    console.error('[updateChangeRequest]:', error)
    return { error: 'Nie udało się zaktualizować Change Request.' }
  }

  revalidatePath(`/projects/${existing.project_id}`)
  return { ok: true }
}

// ─── Change Request — delete ──────────────────────────────────────────────────

export async function deleteChangeRequest(
  crId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: existing, error: fetchErr } = await supabase
    .from('change_requests')
    .select('project_id')
    .eq('id', crId)
    .single()

  if (fetchErr || !existing) return { error: 'Nie znaleziono Change Request.' }

  const { error } = await supabase
    .from('change_requests')
    .delete()
    .eq('id', crId)

  if (error) {
    console.error('[deleteChangeRequest]:', error)
    return { error: 'Nie udało się usunąć Change Request.' }
  }

  revalidatePath(`/projects/${existing.project_id}`)
  return { ok: true }
}

// ─── Change Request — approve/reject ─────────────────────────────────────────

export async function approveCr(
  crId: string,
  side: 'bw' | 'client',
  status: 'approved' | 'rejected',
  notes?: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  const { data: existing, error: fetchErr } = await supabase
    .from('change_requests')
    .select('project_id, bw_approval, client_approval')
    .eq('id', crId)
    .single()

  if (fetchErr || !existing) return { error: 'Nie znaleziono Change Request.' }

  const today = new Date().toISOString().slice(0, 10)
  const updatePayload: Record<string, unknown> = {}

  if (side === 'bw') {
    updatePayload.bw_approval = status
    updatePayload.bw_approval_date = today
    updatePayload.bw_approver = user.id
    if (notes !== undefined) updatePayload.notes = notes
  } else {
    updatePayload.client_approval = status
    updatePayload.client_approval_date = today
    if (notes !== undefined) updatePayload.client_approver = notes // store as string name
  }

  // Recalculate overall status
  const newBwApproval = side === 'bw' ? status : existing.bw_approval
  const newClientApproval = side === 'client' ? status : existing.client_approval

  if (newBwApproval === 'rejected' || newClientApproval === 'rejected') {
    updatePayload.status = 'rejected'
  } else if (newBwApproval === 'approved' && newClientApproval === 'approved') {
    updatePayload.status = 'approved'
  } else if (newBwApproval === 'approved' || newClientApproval === 'approved') {
    updatePayload.status = 'pending'
  }

  const { error } = await supabase
    .from('change_requests')
    .update(updatePayload)
    .eq('id', crId)

  if (error) {
    console.error('[approveCr]:', error)
    return { error: 'Nie udało się zapisać decyzji.' }
  }

  revalidatePath(`/projects/${existing.project_id}`)
  return { ok: true }
}

// ─── RACI — update role ───────────────────────────────────────────────────────

export async function updateRaciRole(
  taskId: string,
  role: string,
  value: 'R' | 'A' | 'C' | 'I' | '-'
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Nie jesteś zalogowany.' }

  // Get project_id for revalidation
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) return { error: 'Nie znaleziono zadania.' }

  if (value === '-') {
    // Delete the assignment
    const { error } = await supabase
      .from('task_role_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('role', role)

    if (error) {
      console.error('[updateRaciRole] delete:', error)
      return { error: 'Nie udało się usunąć przypisania RACI.' }
    }
  } else {
    // Upsert on (task_id, role)
    const { error } = await supabase
      .from('task_role_assignments')
      .upsert(
        { task_id: taskId, role, raci: value },
        { onConflict: 'task_id,role' }
      )

    if (error) {
      console.error('[updateRaciRole] upsert:', error)
      return { error: 'Nie udało się zapisać przypisania RACI.' }
    }
  }

  revalidatePath(`/projects/${task.project_id}`)
  return { ok: true }
}
