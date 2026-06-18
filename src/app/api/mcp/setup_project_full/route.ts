/**
 * setup_project_full — mega-tool dla MCP Phase 1.
 *
 * Uwaga dotycząca atomowości: operacje wykonywane są sekwencyjnie przez PostgREST,
 * który nie obsługuje transakcji przez Supabase JS. Wszystkie walidacje są wykonywane
 * PRZED pierwszym zapisem, żeby zminimalizować ryzyko częściowego zapisu.
 * W przypadku błędu zwracamy partial error z opisem co się nie udało.
 *
 * Milestone UPSERT: tabela milestones nie jest seedowana przy create_project,
 * więc używamy upsert na (project_id, ms_code) — tworzy lub aktualizuje wiersz.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_RAG = ['R', 'A', 'G'] as const
const VALID_MS_STATUS = ['on', 'at', 'off', 'done'] as const
const VALID_STAKEHOLDER_CAT = ['kp', 'ks', 'ki', 'mo'] as const
const VALID_KPI_STATUS = ['on', 'at', 'off', 'done'] as const
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// ---- Types ----
interface BudgetSettingsInput {
  rate_k: number
  rate_w: number
  rate_d: number
  buffer_pct?: number
  pm_overhead_pct?: number
  budget_max?: number
}

interface RiskInput {
  description: string
  probability: number
  impact: number
  rag: string
  owner: string
  category?: string
  phase?: string
  mitigation?: string
}

interface MilestoneInput {
  ms_code: string
  target_date?: string
  status?: string
  name?: string
}

interface StakeholderInput {
  name: string
  category: string
  role?: string
  interest?: string
  expectations?: string
}

interface KpiInput {
  name: string
  target?: string
  status?: string
  notes?: string
}

// ---- Validators ----
function validateBudgetSettings(bs: unknown): string | null {
  if (!bs || typeof bs !== 'object') return 'budget_settings musi byc obiektem.'
  const b = bs as Record<string, unknown>
  if (typeof b.rate_k !== 'number' || b.rate_k < 0) return 'budget_settings.rate_k musi byc liczba >= 0.'
  if (typeof b.rate_w !== 'number' || b.rate_w < 0) return 'budget_settings.rate_w musi byc liczba >= 0.'
  if (typeof b.rate_d !== 'number' || b.rate_d < 0) return 'budget_settings.rate_d musi byc liczba >= 0.'
  if (b.buffer_pct !== undefined && (typeof b.buffer_pct !== 'number' || b.buffer_pct < 0)) return 'budget_settings.buffer_pct musi byc liczba >= 0.'
  if (b.pm_overhead_pct !== undefined && (typeof b.pm_overhead_pct !== 'number' || b.pm_overhead_pct < 0)) return 'budget_settings.pm_overhead_pct musi byc liczba >= 0.'
  if (b.budget_max !== undefined && (typeof b.budget_max !== 'number' || b.budget_max < 0)) return 'budget_settings.budget_max musi byc liczba >= 0.'
  return null
}

function validateRisk(r: unknown, idx: number): string | null {
  if (!r || typeof r !== 'object') return `risks[${idx}] musi byc obiektem.`
  const risk = r as Record<string, unknown>
  if (typeof risk.description !== 'string' || !risk.description.trim()) return `risks[${idx}].description jest wymagany.`
  if (typeof risk.probability !== 'number' || risk.probability < 1 || risk.probability > 5 || !Number.isInteger(risk.probability)) return `risks[${idx}].probability musi byc calkowita 1-5.`
  if (typeof risk.impact !== 'number' || risk.impact < 1 || risk.impact > 5 || !Number.isInteger(risk.impact)) return `risks[${idx}].impact musi byc calkowita 1-5.`
  if (!VALID_RAG.includes(risk.rag as (typeof VALID_RAG)[number])) return `risks[${idx}].rag musi byc 'R', 'A' lub 'G'.`
  if (typeof risk.owner !== 'string' || !risk.owner.trim()) return `risks[${idx}].owner jest wymagany.`
  return null
}

function validateMilestone(m: unknown, idx: number): string | null {
  if (!m || typeof m !== 'object') return `milestones[${idx}] musi byc obiektem.`
  const ms = m as Record<string, unknown>
  if (typeof ms.ms_code !== 'string' || !ms.ms_code.trim()) return `milestones[${idx}].ms_code jest wymagany.`
  if (ms.target_date !== undefined && (typeof ms.target_date !== 'string' || !DATE_REGEX.test(ms.target_date))) return `milestones[${idx}].target_date musi byc YYYY-MM-DD.`
  if (ms.status !== undefined && !VALID_MS_STATUS.includes(ms.status as (typeof VALID_MS_STATUS)[number])) return `milestones[${idx}].status nieprawidlowy.`
  return null
}

function validateStakeholder(s: unknown, idx: number): string | null {
  if (!s || typeof s !== 'object') return `stakeholders[${idx}] musi byc obiektem.`
  const sh = s as Record<string, unknown>
  if (typeof sh.name !== 'string' || !sh.name.trim()) return `stakeholders[${idx}].name jest wymagany.`
  if (!VALID_STAKEHOLDER_CAT.includes(sh.category as (typeof VALID_STAKEHOLDER_CAT)[number])) return `stakeholders[${idx}].category nieprawidlowy.`
  return null
}

function validateKpi(k: unknown, idx: number): string | null {
  if (!k || typeof k !== 'object') return `kpis[${idx}] musi byc obiektem.`
  const kpi = k as Record<string, unknown>
  if (typeof kpi.name !== 'string' || !kpi.name.trim()) return `kpis[${idx}].name jest wymagany.`
  if (kpi.status !== undefined && !VALID_KPI_STATUS.includes(kpi.status as (typeof VALID_KPI_STATUS)[number])) return `kpis[${idx}].status nieprawidlowy.`
  return null
}

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { project_id, budget_settings, risks, milestones, stakeholders, kpis } = body

  if (typeof project_id !== 'string' || !project_id.trim()) {
    return NextResponse.json({ ok: false, error: 'project_id jest wymagany.' }, { status: 400 })
  }

  // ---- Walidacja WSZYSTKICH sekcji przed jakimkolwiek zapisem ----
  if (budget_settings !== undefined) {
    const err = validateBudgetSettings(budget_settings)
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 })
  }

  if (risks !== undefined) {
    if (!Array.isArray(risks)) return NextResponse.json({ ok: false, error: 'risks musi byc tablica.' }, { status: 400 })
    for (let i = 0; i < risks.length; i++) {
      const err = validateRisk(risks[i], i)
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 })
    }
  }

  if (milestones !== undefined) {
    if (!Array.isArray(milestones)) return NextResponse.json({ ok: false, error: 'milestones musi byc tablica.' }, { status: 400 })
    for (let i = 0; i < milestones.length; i++) {
      const err = validateMilestone(milestones[i], i)
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 })
    }
  }

  if (stakeholders !== undefined) {
    if (!Array.isArray(stakeholders)) return NextResponse.json({ ok: false, error: 'stakeholders musi byc tablica.' }, { status: 400 })
    for (let i = 0; i < stakeholders.length; i++) {
      const err = validateStakeholder(stakeholders[i], i)
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 })
    }
  }

  if (kpis !== undefined) {
    if (!Array.isArray(kpis)) return NextResponse.json({ ok: false, error: 'kpis musi byc tablica.' }, { status: 400 })
    for (let i = 0; i < kpis.length; i++) {
      const err = validateKpi(kpis[i], i)
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 })
    }
  }

  // Sprawdź czy cokolwiek jest do zrobienia
  const hasWork = budget_settings !== undefined
    || (Array.isArray(risks) && risks.length > 0)
    || (Array.isArray(milestones) && milestones.length > 0)
    || (Array.isArray(stakeholders) && stakeholders.length > 0)
    || (Array.isArray(kpis) && kpis.length > 0)

  if (!hasWork) {
    return NextResponse.json({ ok: false, error: 'Brak sekcji do zapisania.' }, { status: 400 })
  }

  // TODO: new tables not in generated types/supabase.ts yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const summary: Record<string, unknown> = {}
  const errors: string[] = []

  // 1. budget_settings — UPSERT
  if (budget_settings !== undefined) {
    const bs = budget_settings as BudgetSettingsInput
    const { error } = await supabase
      .from('budget_settings')
      .upsert(
        {
          project_id,
          rate_k: bs.rate_k,
          rate_w: bs.rate_w,
          rate_d: bs.rate_d,
          buffer_pct: bs.buffer_pct ?? 0,
          pm_overhead_pct: bs.pm_overhead_pct ?? 0,
          budget_max: bs.budget_max ?? null,
        },
        { onConflict: 'project_id' }
      )
    if (error) {
      console.error('[mcp/setup_project_full] budget_settings failed:', error)
      errors.push(`budget_settings: ${error.message}`)
    } else {
      summary.budget_settings = 'upserted'
    }
  }

  // 2. risks — batch INSERT
  if (Array.isArray(risks) && risks.length > 0) {
    const rows = (risks as RiskInput[]).map((r) => ({
      project_id,
      description: r.description.trim(),
      category: r.category?.trim() || null,
      phase: r.phase?.trim() || null,
      probability: r.probability,
      impact: r.impact,
      rag: r.rag,
      owner: r.owner.trim(),
      mitigation: r.mitigation?.trim() || null,
      status: 'open',
    }))

    const { data: inserted, error } = await supabase
      .from('risks')
      .insert(rows)
      .select('id')

    if (error) {
      console.error('[mcp/setup_project_full] risks failed:', error)
      errors.push(`risks: ${error.message}`)
    } else {
      summary.risks = { inserted: (inserted as { id: string }[]).length }
    }
  }

  // 3. milestones — manual upsert (no unique constraint on project_id,ms_code in schema)
  // milestones table has no unique (project_id, ms_code) so DB-level upsert would throw 42P10.
  // Strategy: fetch existing rows for this project+ms_codes, update them, insert the rest.
  if (Array.isArray(milestones) && milestones.length > 0) {
    const msList = milestones as MilestoneInput[]
    const msCodes = msList.map((m) => m.ms_code.trim())

    const { data: existing, error: fetchErr } = await supabase
      .from('milestones')
      .select('id, ms_code')
      .eq('project_id', project_id)
      .in('ms_code', msCodes)

    if (fetchErr) {
      console.error('[mcp/setup_project_full] milestones fetch failed:', fetchErr)
      errors.push(`milestones: ${fetchErr.message}`)
    } else {
      const existingMap = new Map(
        (existing as { id: string; ms_code: string }[]).map((r) => [r.ms_code, r.id])
      )

      const toUpdate = msList.filter((m) => existingMap.has(m.ms_code.trim()))
      const toInsert = msList.filter((m) => !existingMap.has(m.ms_code.trim()))

      let updatedCount = 0
      let insertedCount = 0
      const msErrors: string[] = []

      // Update existing
      for (const m of toUpdate) {
        const id = existingMap.get(m.ms_code.trim())!
        const upd: Record<string, unknown> = {}
        if (m.target_date) upd.target_date = m.target_date
        if (m.status) upd.status = m.status
        if (m.name) upd.name = m.name
        if (Object.keys(upd).length > 0) {
          const { error } = await supabase.from('milestones').update(upd).eq('id', id)
          if (error) msErrors.push(`update ${m.ms_code}: ${error.message}`)
          else updatedCount++
        } else {
          updatedCount++ // no change — still counts as processed
        }
      }

      // Insert new
      if (toInsert.length > 0) {
        const insertRows = toInsert.map((m) => ({
          project_id,
          ms_code: m.ms_code.trim(),
          name: m.ms_code.trim(), // required field — use ms_code as label
          target_date: m.target_date ?? null,
          status: (m.status as string) ?? 'on',
        }))
        const { data: inserted, error: insertErr } = await supabase
          .from('milestones')
          .insert(insertRows)
          .select('id')
        if (insertErr) msErrors.push(`insert batch: ${insertErr.message}`)
        else insertedCount = (inserted as { id: string }[]).length
      }

      if (msErrors.length > 0) {
        errors.push(`milestones: ${msErrors.join('; ')}`)
      }
      summary.milestones = { updated: updatedCount, inserted: insertedCount }
    }
  }

  // 4. stakeholders — batch INSERT
  if (Array.isArray(stakeholders) && stakeholders.length > 0) {
    const rows = (stakeholders as StakeholderInput[]).map((s) => ({
      project_id,
      name: s.name.trim(),
      category: s.category,
      role: s.role?.trim() || null,
      interest: s.interest?.trim() || null,
      expectations: s.expectations?.trim() || null,
    }))

    const { data: inserted, error } = await supabase
      .from('stakeholders')
      .insert(rows)
      .select('id')

    if (error) {
      console.error('[mcp/setup_project_full] stakeholders failed:', error)
      errors.push(`stakeholders: ${error.message}`)
    } else {
      summary.stakeholders = { inserted: (inserted as { id: string }[]).length }
    }
  }

  // 5. kpis — batch INSERT
  if (Array.isArray(kpis) && kpis.length > 0) {
    const rows = (kpis as KpiInput[]).map((k) => ({
      project_id,
      name: k.name.trim(),
      target: k.target?.trim() || null,
      status: (k.status as string) ?? 'on',
      notes: k.notes?.trim() || null,
    }))

    const { data: inserted, error } = await supabase
      .from('kpis')
      .insert(rows)
      .select('id')

    if (error) {
      console.error('[mcp/setup_project_full] kpis failed:', error)
      errors.push(`kpis: ${error.message}`)
    } else {
      summary.kpis = { inserted: (inserted as { id: string }[]).length }
    }
  }

  // Activity log — jeden wpis dla całej operacji (nieblokujące)
  try {
    await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: project_id,
      action: 'setup_project_full',
      actor_id: user.userId,
      before: null,
      after: { summary, errors: errors.length > 0 ? errors : undefined },
    })
  } catch { /* ignore log failures */ }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Czesciowy blad podczas setup: ${errors.join('; ')}`,
        partial: summary,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, data: { summary } })
}
