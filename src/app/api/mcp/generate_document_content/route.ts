import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

const SUPPORTED_DOC_TYPES = ['schedule', 'raid', 'budget', 'kpi', 'cr'] as const
type DocType = (typeof SUPPORTED_DOC_TYPES)[number]

const DOC_TYPE_LABELS: Record<DocType, string> = {
  schedule: 'Harmonogram projektu',
  raid: 'RAID Log',
  budget: 'Budget Tracker',
  kpi: 'KPI Tracker',
  cr: 'Rejestr Change Requests',
}

export async function POST(request: NextRequest) {
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  const body = await request.json().catch(() => ({})) as {
    project_id?: string
    doc_type?: string
    format?: string
  }

  if (!body.project_id) {
    return NextResponse.json({ ok: false, error: 'project_id is required' }, { status: 400 })
  }
  if (!body.doc_type || !SUPPORTED_DOC_TYPES.includes(body.doc_type as DocType)) {
    return NextResponse.json({
      ok: false,
      error: `doc_type musi być jednym z: ${SUPPORTED_DOC_TYPES.join(', ')}`,
    }, { status: 400 })
  }

  const docType = body.doc_type as DocType
  const supabase = createAdminClient()

  try {
    // Verify project exists
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date, status')
      .eq('id', body.project_id)
      .single()

    if (projErr || !project) {
      return NextResponse.json({ ok: false, error: 'Projekt nie znaleziony' }, { status: 404 })
    }

    let content: Record<string, unknown> = {}

    switch (docType) {
      case 'schedule': {
        const [{ data: steps }, { data: tasks }, { data: milestones }] = await Promise.all([
          supabase
            .from('project_steps')
            .select('id, phase_number, phase_name, step_title, status, is_active, step_order')
            .eq('project_id', body.project_id)
            .order('phase_number').order('step_order'),
          supabase
            .from('tasks')
            .select('id, step_id, title, kind, status, w_start, w_end, est, assignee_name, completion_date, is_milestone, hidden, type')
            .eq('project_id', body.project_id)
            .eq('hidden', false)
            .order('task_order'),
          supabase
            .from('milestones')
            .select('id, ms_code, name, week, status')
            .eq('project_id', body.project_id)
            .order('week', { ascending: true, nullsFirst: false }),
        ])
        const tasksByStep = new Map<string, unknown[]>()
        for (const t of tasks ?? []) {
          const arr = tasksByStep.get(t.step_id) ?? []
          arr.push(t)
          tasksByStep.set(t.step_id, arr)
        }
        content = {
          project: { id: project.id, name: project.name, startDate: project.start_date, endDate: project.end_date },
          phases: (steps ?? []).map(s => ({
            id: s.id,
            phaseNumber: s.phase_number,
            phaseName: s.phase_name,
            stepTitle: s.step_title,
            status: s.status,
            isActive: s.is_active,
            tasks: tasksByStep.get(s.id) ?? [],
          })),
          milestones: milestones ?? [],
        }
        break
      }

      case 'raid': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [{ data: risks }, { data: questions }, { data: decisions }] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('risks')
            .select('id, description, category, phase, probability, impact, score, rag, owner, mitigation, status, created_at')
            .eq('project_id', body.project_id),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from('questions_doubts')
            .select('id, question, answer, rag, status, asked_date, created_at')
            .eq('project_id', body.project_id)
            .order('created_at'),
          supabase
            .from('decision_points')
            .select('id, type, title, status, decided_by, decided_at, notes')
            .eq('project_id', body.project_id)
            .order('created_at' as never),
        ])
        // Sortuj ryzyka wg score malejąco (najgroźniejsze pierwsze)
        const sortedRisks = ((risks ?? []) as Record<string, unknown>[])
          .sort((a, b) => ((b.score as number) ?? 0) - ((a.score as number) ?? 0))
        content = {
          risks: sortedRisks,
          assumptions: questions ?? [],    // A — pytania/wątpliwości
          decisions: decisions ?? [],       // D — diamenciki decyzyjne
          // I (Issues) = brak dedykowanej tabeli — PM może dodać ręcznie
        }
        break
      }

      case 'budget': {
        const [{ data: settings }, { data: lines }] = await Promise.all([
          supabase
            .from('budget_settings')
            .select('rate_k, rate_w, rate_d, buffer_pct, pm_overhead_pct, budget_max')
            .eq('project_id', body.project_id)
            .maybeSingle(),
          supabase
            .from('budget_lines')
            .select('id, task_id, phase, rate_type, est_h, actual_h, description')
            .eq('project_id', body.project_id)
            .order('created_at' as never),
        ])
        content = { settings: settings ?? null, lines: lines ?? [] }
        break
      }

      case 'kpi': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: kpis } = await (supabase as any)
          .from('kpis')
          .select('id, name, target, actual_value, status, notes')
          .eq('project_id', body.project_id)
        content = { kpis: kpis ?? [] }
        break
      }

      case 'cr': {
        const { data: crs } = await supabase
          .from('change_requests')
          .select('id, title, cr_type, impact_level, estimated_hours, estimated_cost, status, bw_approval, notes, created_at')
          .eq('project_id', body.project_id)
          .order('created_at')
        content = { changeRequests: crs ?? [] }
        break
      }
    }

    const docName = `${DOC_TYPE_LABELS[docType]} — ${project.name} (draft)`

    // Upsert: jeśli dokument tego typu już istnieje, nadpisz; inaczej utwórz
    const { data: existingDoc } = await supabase
      .from('project_documents')
      .select('id')
      .eq('project_id', body.project_id)
      .eq('type', docType)
      .eq('uploaded_by', userId)
      .maybeSingle()

    let documentId: string

    if (existingDoc) {
      await supabase
        .from('project_documents')
        .update({ name: docName, content: content as never })
        .eq('id', existingDoc.id)
      documentId = existingDoc.id
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('project_documents')
        .insert({
          project_id: body.project_id,
          name: docName,
          type: docType,
          uploaded_by: userId,
          content: content as never,
          storage_path: null,
        })
        .select('id')
        .single()

      if (insErr || !inserted) {
        console.error('[mcp/generate_document_content] insert failed:', insErr)
        return NextResponse.json({ ok: false, error: 'Nie udało się zapisać dokumentu' }, { status: 500 })
      }
      documentId = (inserted as { id: string }).id
    }

    return NextResponse.json({
      ok: true,
      data: {
        documentId,
        name: docName,
        type: docType,
        content,
        note: 'Dokument zapisany jako draft. Edytuj w aplikacji lub zaktualizuj przez kolejne wywołanie.',
      },
    })
  } catch (err) {
    console.error('[mcp/generate_document_content] Unexpected error:', err)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
