'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/dal'
import type { RagValue, RiskStatus, KpiStatus } from '@/lib/data/projects'

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
