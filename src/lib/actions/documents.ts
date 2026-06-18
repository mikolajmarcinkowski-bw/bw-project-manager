'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/dal'
import type { RagValue, RiskStatus, KpiStatus, RateType, CrType, CrImpact, CrStatus } from '@/lib/data/projects'

// ─── RAG auto-kalkulator ──────────────────────────────────────────────────────
// score = probability × impact; ≥15=R, ≥6=A, else G

function calcRag(probability: number, impact: number): RagValue {
  const score = probability * impact
  if (score >= 15) return 'R'
  if (score >= 6) return 'A'
  return 'G'
}

// ─── Typy danych ─────────────────────────────────────────────────────────────

export interface RiskData {
  description: string
  category?: string | null
  phase?: string | null
  probability: number
  impact: number
  rag?: RagValue | null
  owner: string
  mitigation?: string | null
  status?: RiskStatus
}

export interface KpiData {
  name: string
  target?: string | null
  status?: KpiStatus
  notes?: string | null
}

// ─── RISK actions ─────────────────────────────────────────────────────────────

export async function addRisk(
  projectId: string,
  data: RiskData
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const description = (data.description ?? '').trim()
  if (!description) return { error: 'Opis jest wymagany.' }
  if (!projectId) return { error: 'ID projektu jest wymagane.' }

  const probability = data.probability
  const impact = data.impact
  if (!Number.isInteger(probability) || probability < 1 || probability > 5) {
    return { error: 'Prawdopodobieństwo musi być liczbą całkowitą 1–5.' }
  }
  if (!Number.isInteger(impact) || impact < 1 || impact > 5) {
    return { error: 'Wpływ musi być liczbą całkowitą 1–5.' }
  }

  const owner = (data.owner ?? '').trim()
  if (!owner) return { error: 'Właściciel jest wymagany.' }

  // RAG: auto-wylicz jeśli nie podano
  const rag: RagValue = data.rag ?? calcRag(probability, impact)

  // risks not in generated types yet — cast to any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase as any)
    .from('risks')
    .insert({
      project_id: projectId,
      description,
      category: data.category?.trim() || null,
      phase: data.phase?.trim() || null,
      probability,
      impact,
      rag,
      owner,
      mitigation: data.mitigation?.trim() || null,
      status: data.status ?? 'open',
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[addRisk] insert failed:', insertErr)
    return { error: 'Nie udało się dodać ryzyka.' }
  }

  const riskId = (inserted as { id: string }).id

  await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'add_risk',
    actor_id: user.id,
    before: null,
    after: { risk_id: riskId, description, rag, owner, probability, impact },
  }).then(({ error }) => {
    if (error) console.error('[addRisk] activity_log failed:', error)
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: riskId }
}

export async function updateRisk(
  riskId: string,
  data: Partial<RiskData>
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  if (!riskId) return { error: 'ID ryzyka jest wymagane.' }

  const updates: Record<string, unknown> = {}

  if (data.description !== undefined) {
    const desc = data.description.trim()
    if (!desc) return { error: 'Opis nie może być pusty.' }
    updates.description = desc
  }
  if (data.category !== undefined) updates.category = data.category?.trim() || null
  if (data.phase !== undefined) updates.phase = data.phase?.trim() || null
  if (data.probability !== undefined) {
    if (!Number.isInteger(data.probability) || data.probability < 1 || data.probability > 5) {
      return { error: 'Prawdopodobieństwo musi być liczbą całkowitą 1–5.' }
    }
    updates.probability = data.probability
  }
  if (data.impact !== undefined) {
    if (!Number.isInteger(data.impact) || data.impact < 1 || data.impact > 5) {
      return { error: 'Wpływ musi być liczbą całkowitą 1–5.' }
    }
    updates.impact = data.impact
  }
  if (data.owner !== undefined) {
    const owner = data.owner.trim()
    if (!owner) return { error: 'Właściciel nie może być pusty.' }
    updates.owner = owner
  }
  if (data.mitigation !== undefined) updates.mitigation = data.mitigation?.trim() || null
  if (data.status !== undefined) updates.status = data.status

  // Auto-recalculate RAG when probability or impact changes
  const newProb = (data.probability ?? undefined) as number | undefined
  const newImpact = (data.impact ?? undefined) as number | undefined
  if (newProb !== undefined || newImpact !== undefined) {
    if (data.rag) {
      updates.rag = data.rag
    } else if (newProb !== undefined && newImpact !== undefined) {
      updates.rag = calcRag(newProb, newImpact)
    } else {
      // Need to fetch current values to recalculate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: current } = await (supabase as any)
        .from('risks')
        .select('probability, impact')
        .eq('id', riskId)
        .single()
      if (current) {
        const p = (newProb ?? (current as { probability: number }).probability) as number
        const i = (newImpact ?? (current as { impact: number }).impact) as number
        updates.rag = calcRag(p, i)
      }
    }
  } else if (data.rag !== undefined) {
    updates.rag = data.rag
  }

  if (Object.keys(updates).length === 0) return { ok: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updErr } = await (supabase as any)
    .from('risks')
    .update(updates)
    .eq('id', riskId)
    .select('id, project_id')
    .single()

  if (updErr) {
    console.error('[updateRisk] update failed:', updErr)
    return { error: 'Nie udało się zaktualizować ryzyka.' }
  }

  const row = updated as { id: string; project_id: string }

  await supabase.from('activity_log').insert({
    entity: 'risk',
    entity_id: riskId,
    action: 'update_risk',
    actor_id: user.id,
    before: null,
    after: updates,
  }).then(({ error }) => {
    if (error) console.error('[updateRisk] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

export async function deleteRisk(
  riskId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (supabase as any)
    .from('risks')
    .select('id, project_id')
    .eq('id', riskId)
    .single()

  if (fetchErr || !existing) {
    return { error: 'Nie znaleziono ryzyka.' }
  }

  const row = existing as { id: string; project_id: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (supabase as any)
    .from('risks')
    .delete()
    .eq('id', riskId)

  if (delErr) {
    console.error('[deleteRisk] delete failed:', delErr)
    return { error: 'Nie udało się usunąć ryzyka.' }
  }

  await supabase.from('activity_log').insert({
    entity: 'risk',
    entity_id: riskId,
    action: 'delete_risk',
    actor_id: user.id,
    before: { risk_id: riskId },
    after: null,
  }).then(({ error }) => {
    if (error) console.error('[deleteRisk] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

export async function updateRiskStatus(
  riskId: string,
  status: RiskStatus
): Promise<{ ok: true } | { error: string }> {
  const VALID: RiskStatus[] = ['open', 'monitor', 'closed']
  if (!VALID.includes(status)) return { error: 'Nieprawidłowy status ryzyka.' }

  const user = await requireUser()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: before, error: fetchErr } = await (supabase as any)
    .from('risks')
    .select('id, status, project_id')
    .eq('id', riskId)
    .single()

  if (fetchErr || !before) return { error: 'Nie znaleziono ryzyka.' }

  const row = before as { id: string; status: string; project_id: string }
  if (row.status === status) return { ok: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase as any)
    .from('risks')
    .update({ status })
    .eq('id', riskId)

  if (updErr) {
    console.error('[updateRiskStatus] update failed:', updErr)
    return { error: 'Nie udało się zaktualizować statusu ryzyka.' }
  }

  await supabase.from('activity_log').insert({
    entity: 'risk',
    entity_id: riskId,
    action: 'update_risk_status',
    actor_id: user.id,
    before: { status: row.status },
    after: { status },
  }).then(({ error }) => {
    if (error) console.error('[updateRiskStatus] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

// ─── KPI actions ──────────────────────────────────────────────────────────────

export async function addKpi(
  projectId: string,
  data: KpiData
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const name = (data.name ?? '').trim()
  if (!name) return { error: 'Nazwa KPI jest wymagana.' }
  if (!projectId) return { error: 'ID projektu jest wymagane.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (supabase as any)
    .from('kpis')
    .insert({
      project_id: projectId,
      name,
      target: data.target?.trim() || null,
      status: data.status ?? 'on',
      notes: data.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[addKpi] insert failed:', insertErr)
    return { error: 'Nie udało się dodać KPI.' }
  }

  const kpiId = (inserted as { id: string }).id

  await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: projectId,
    action: 'add_kpi',
    actor_id: user.id,
    before: null,
    after: { kpi_id: kpiId, name, status: data.status ?? 'on' },
  }).then(({ error }) => {
    if (error) console.error('[addKpi] activity_log failed:', error)
  })

  revalidatePath(`/projects/${projectId}`)
  return { ok: true, id: kpiId }
}

export async function updateKpi(
  kpiId: string,
  data: Partial<KpiData>
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  if (!kpiId) return { error: 'ID KPI jest wymagane.' }

  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) {
    const name = data.name.trim()
    if (!name) return { error: 'Nazwa KPI nie może być pusta.' }
    updates.name = name
  }
  if (data.target !== undefined) updates.target = data.target?.trim() || null
  if (data.status !== undefined) updates.status = data.status
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null

  if (Object.keys(updates).length === 0) return { ok: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updErr } = await (supabase as any)
    .from('kpis')
    .update(updates)
    .eq('id', kpiId)
    .select('id, project_id')
    .single()

  if (updErr) {
    console.error('[updateKpi] update failed:', updErr)
    return { error: 'Nie udało się zaktualizować KPI.' }
  }

  const row = updated as { id: string; project_id: string }

  await supabase.from('activity_log').insert({
    entity: 'kpi',
    entity_id: kpiId,
    action: 'update_kpi',
    actor_id: user.id,
    before: null,
    after: updates,
  }).then(({ error }) => {
    if (error) console.error('[updateKpi] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

export async function deleteKpi(
  kpiId: string
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchErr } = await (supabase as any)
    .from('kpis')
    .select('id, project_id')
    .eq('id', kpiId)
    .single()

  if (fetchErr || !existing) return { error: 'Nie znaleziono KPI.' }

  const row = existing as { id: string; project_id: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delErr } = await (supabase as any)
    .from('kpis')
    .delete()
    .eq('id', kpiId)

  if (delErr) {
    console.error('[deleteKpi] delete failed:', delErr)
    return { error: 'Nie udało się usunąć KPI.' }
  }

  await supabase.from('activity_log').insert({
    entity: 'kpi',
    entity_id: kpiId,
    action: 'delete_kpi',
    actor_id: user.id,
    before: { kpi_id: kpiId },
    after: null,
  }).then(({ error }) => {
    if (error) console.error('[deleteKpi] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

export async function updateKpiStatus(
  kpiId: string,
  status: KpiStatus
): Promise<{ ok: true } | { error: string }> {
  const VALID: KpiStatus[] = ['on', 'at', 'off', 'done']
  if (!VALID.includes(status)) return { error: 'Nieprawidłowy status KPI.' }

  const user = await requireUser()
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: before, error: fetchErr } = await (supabase as any)
    .from('kpis')
    .select('id, status, project_id')
    .eq('id', kpiId)
    .single()

  if (fetchErr || !before) return { error: 'Nie znaleziono KPI.' }

  const row = before as { id: string; status: string; project_id: string }
  if (row.status === status) return { ok: true }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase as any)
    .from('kpis')
    .update({ status })
    .eq('id', kpiId)

  if (updErr) {
    console.error('[updateKpiStatus] update failed:', updErr)
    return { error: 'Nie udało się zaktualizować statusu KPI.' }
  }

  await supabase.from('activity_log').insert({
    entity: 'kpi',
    entity_id: kpiId,
    action: 'update_kpi_status',
    actor_id: user.id,
    before: { status: row.status },
    after: { status },
  }).then(({ error }) => {
    if (error) console.error('[updateKpiStatus] activity_log failed:', error)
  })

  revalidatePath(`/projects/${row.project_id}`)
  return { ok: true }
}

// ─── Milestone actions ────────────────────────────────────────────────────────

export type MilestoneStatusValue = 'on' | 'at' | 'off' | 'done'

export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatusValue
): Promise<{ ok: true } | { error: string }> {
  const VALID: MilestoneStatusValue[] = ['on', 'at', 'off', 'done']
  if (!VALID.includes(status)) return { error: 'Nieprawidłowy status kamienia milowego.' }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('milestones')
    .select('id, status, project_id')
    .eq('id', milestoneId)
    .single()

  if (fetchErr || !before) return { error: 'Nie znaleziono kamienia milowego.' }
  if (before.status === status) return { ok: true }

  const { error: updErr } = await supabase
    .from('milestones')
    .update({ status })
    .eq('id', milestoneId)

  if (updErr) {
    console.error('[updateMilestoneStatus] update failed:', updErr)
    return { error: 'Nie udało się zaktualizować statusu kamienia milowego.' }
  }

  await supabase.from('activity_log').insert({
    entity: 'milestone',
    entity_id: milestoneId,
    action: 'update_milestone_status',
    actor_id: user.id,
    before: { status: before.status },
    after: { status },
  }).then(({ error }) => {
    if (error) console.error('[updateMilestoneStatus] activity_log failed:', error)
  })

  revalidatePath(`/projects/${before.project_id}`)
  return { ok: true }
}
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

  // Allowlist statusów dozwolonych przez updateChangeRequest
  // 'approved' i 'rejected' wymagają przejścia przez approveCr (dual-approval)
  const ALLOWED_STATUSES = ['draft', 'pending', 'implemented'] as const

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
  if (data.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(data.status as typeof ALLOWED_STATUSES[number])) {
      return { error: 'Użyj approveCr do zatwierdzenia lub odrzucenia CR.' }
    }
    updatePayload.status = data.status
  }
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
    .select('id, project_id, bw_approval, client_approval')
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

  // Activity log (nieblokujące)
  await supabase.from('activity_log').insert({
    entity: 'project',
    entity_id: existing.project_id,
    action: 'approve_cr',
    actor_id: user.id,
    before: { [`${side}_approval`]: side === 'bw' ? existing.bw_approval : existing.client_approval },
    after: { [`${side}_approval`]: status, notes },
  }).then(({ error }) => {
    if (error) console.error('[approveCr] activity_log failed:', error)
  })

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

