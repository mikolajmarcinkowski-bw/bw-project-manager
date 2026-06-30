import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyMcpToken } from '@/lib/mcp/auth'

// Walidacja UUID — proste sprawdzenie formatu
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_IMPL_TYPES = ['CRM', 'SPO', 'INT', 'MKT', 'ERP'] as const
type ImplType = (typeof VALID_IMPL_TYPES)[number]

export async function POST(request: NextRequest) {
  // Auth
  const user = await verifyMcpToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const userId = user.userId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    client_name,
    project_name,
    type: typeParam,
    start_date: startDateParam,
    description,
    pm_ids,
    na_template_ids,
  } = body as Record<string, unknown>

  // Walidacja project_name
  const name = typeof project_name === 'string' ? project_name.trim() : ''
  if (!name) {
    return NextResponse.json({ ok: false, error: 'project_name jest wymagany.' }, { status: 400 })
  }

  // Walidacja type[]
  if (!Array.isArray(typeParam) || typeParam.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'type[] wymagany co najmniej jeden element.' },
      { status: 400 }
    )
  }
  const types: ImplType[] = []
  for (const t of typeParam) {
    if (!VALID_IMPL_TYPES.includes(t as ImplType)) {
      return NextResponse.json({ ok: false, error: `Nieprawidlowy typ projektu: ${t}.` }, { status: 400 })
    }
    types.push(t as ImplType)
  }

  // Walidacja start_date
  const start_date = typeof startDateParam === 'string' ? startDateParam.trim() : ''
  if (!start_date) {
    return NextResponse.json({ ok: false, error: 'start_date jest wymagany.' }, { status: 400 })
  }
  if (isNaN(Date.parse(start_date))) {
    return NextResponse.json(
      { ok: false, error: 'start_date ma nieprawidlowy format (wymagane ISO).' },
      { status: 400 }
    )
  }
  if (start_date < '2000-01-01') {
    return NextResponse.json(
      { ok: false, error: 'start_date jest nierealistycznie wczesna.' },
      { status: 400 }
    )
  }

  const descriptionVal = typeof description === 'string' ? description.trim() || null : null
  const pm_ids_arr: string[] = Array.isArray(pm_ids) ? (pm_ids as string[]).filter(Boolean) : []
  const na_template_ids_arr: string[] = Array.isArray(na_template_ids)
    ? (na_template_ids as string[]).filter(
        (x): x is string => typeof x === 'string' && x.length > 0
      )
    : []

  const supabase = createAdminClient()

  // Rozwiaz client_id — UUID bezposrednio lub lookup po nazwie
  let client_id: string
  const clientNameStr = typeof client_name === 'string' ? client_name.trim() : ''
  if (!clientNameStr) {
    return NextResponse.json({ ok: false, error: 'client_name jest wymagany.' }, { status: 400 })
  }

  if (UUID_REGEX.test(clientNameStr)) {
    // Bezposrednio UUID
    client_id = clientNameStr
  } else {
    // Lookup po nazwie (case-insensitive)
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', clientNameStr)

    if (clientErr) {
      console.error('[create_project] clients lookup failed:', clientErr)
      return NextResponse.json({ ok: false, error: 'Blad wyszukiwania klienta.' }, { status: 500 })
    }
    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { ok: false, error: `Klient "${clientNameStr}" nie zostal znaleziony.` },
        { status: 404 }
      )
    }
    if (clients.length > 1) {
      return NextResponse.json(
        {
          error: `Znaleziono ${clients.length} klientow pasujacych do "${clientNameStr}". Podaj dokladna nazwe lub UUID.`,
        },
        { status: 400 }
      )
    }
    client_id = clients[0].id
  }

  try {
    // 1. INSERT projekt
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        client_id,
        start_date,
        description: descriptionVal,
        status: 'active',
        variant: 'standard',
      })
      .select('id')
      .single()

    if (projectError || !project) {
      console.error('[create_project] projects insert failed:', projectError)
      return NextResponse.json({ ok: false, error: 'Nie udalo sie utworzyc projektu.' }, { status: 500 })
    }

    const projectId = (project as { id: string }).id

    // Helper: best-effort cleanup on partial failure
    const cleanup = async () => {
      await supabase.from('projects').delete().eq('id', projectId)
    }

    // 2. INSERT typy projektu
    const { error: typesError } = await supabase.from('project_types').insert(
      types.map((type) => ({ project_id: projectId, type }))
    )
    if (typesError) {
      console.error('[create_project] project_types insert failed:', typesError)
      await cleanup()
      return NextResponse.json(
        { ok: false, error: 'Nie udalo sie przypisac typow projektu.' },
        { status: 500 }
      )
    }

    // 3. INSERT PM-ow (opcjonalne)
    if (pm_ids_arr.length > 0) {
      const { error: pmsError } = await supabase.from('project_pms').insert(
        pm_ids_arr.map((profile_id) => ({ project_id: projectId, profile_id }))
      )
      if (pmsError) {
        console.error('[create_project] project_pms insert failed:', pmsError)
        await cleanup()
        return NextResponse.json(
          { ok: false, error: 'Nie udalo sie przypisac kierownikow projektu.' },
          { status: 500 }
        )
      }
    }

    // 4. R15 — pobierz szablony krokow (fazy 0..8, bez recurring)
    const { data: stepTemplates, error: stError } = await supabase
      .from('step_templates')
      .select(
        'id, phase_number, phase_name, step_order, step_title, kind, is_decision, is_parallel, is_recurring'
      )
      .in('phase_number', [0, 1, 2, 3, 4, 5, 6, 7, 8])
      .eq('is_recurring', false)
      .order('phase_number', { ascending: true })
      .order('step_order', { ascending: true })

    if (stError || !stepTemplates) {
      console.error('[create_project] step_templates fetch failed:', stError)
      await cleanup()
      return NextResponse.json(
        { ok: false, error: 'Nie udalo sie pobrac szablonow krokow.' },
        { status: 500 }
      )
    }

    const stepTemplateIds = stepTemplates.map((t) => t.id)

    // Pobierz task templates w jednym zapytaniu
    type TaskTemplateRow = {
      id: string
      step_template_id: string
      task_order: number
      task_title: string
      kind: string
      applies_to_types: ImplType[]
      w_start: number | null
      w_end: number | null
      est: number | null
      is_milestone: boolean
    }

    let taskTemplates: TaskTemplateRow[] = []
    let ttError: unknown = null

    if (stepTemplateIds.length > 0) {
      const result = await supabase
        .from('step_task_templates')
        .select(
          'id, step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone'
        )
        .in('step_template_id', stepTemplateIds)
      taskTemplates = (result.data ?? []) as TaskTemplateRow[]
      ttError = result.error
    }

    if (ttError) {
      console.error('[create_project] step_task_templates fetch failed:', ttError)
      await cleanup()
      return NextResponse.json(
        { ok: false, error: 'Nie udalo sie pobrac szablonow zadan.' },
        { status: 500 }
      )
    }

    // Grupuj task templates po step_template_id
    const tasksByStepTemplate = new Map<string, TaskTemplateRow[]>()
    for (const tt of taskTemplates) {
      const arr = tasksByStepTemplate.get(tt.step_template_id) ?? []
      arr.push(tt)
      tasksByStepTemplate.set(tt.step_template_id, arr)
    }

    const selectedTypesSet = new Set<string>(types)
    const naSet = new Set<string>(na_template_ids_arr)
    let maxWEnd = 0

    // Petla R15: dla kazdego szablonu kroku → INSERT krok → batch INSERT zadania
    for (const st of stepTemplates) {
      const { data: insertedStep, error: stepInsertError } = await supabase
        .from('project_steps')
        .insert({
          project_id: projectId,
          step_template_id: st.id,
          phase_number: st.phase_number,
          phase_name: st.phase_name,
          step_order: st.step_order,
          step_title: st.step_title,
          kind: st.kind,
          is_decision: st.is_decision,
          is_parallel: st.is_parallel,
          is_recurring: false,
          status: 'todo',
          is_active: false,
        })
        .select('id')
        .single()

      if (stepInsertError || !insertedStep) {
        console.error('[create_project] project_steps insert failed:', stepInsertError)
        await cleanup()
        return NextResponse.json(
          { ok: false, error: 'Nie udalo sie utworzyc krokow projektu.' },
          { status: 500 }
        )
      }

      const stepId = (insertedStep as { id: string }).id
      const templates = tasksByStepTemplate.get(st.id) ?? []

      // R15: applies_to_types puste LUB przecina sie z wybranymi typami
      const filteredTasks = templates.filter((tt) => {
        if (!tt.applies_to_types || tt.applies_to_types.length === 0) return true
        return tt.applies_to_types.some((t: string) => selectedTypesSet.has(t))
      })

      if (filteredTasks.length === 0) continue

      for (const tt of filteredTasks) {
        if (tt.w_end !== null && tt.w_end !== undefined && tt.w_end > maxWEnd) maxWEnd = tt.w_end
      }

      const { error: tasksInsertError } = await supabase.from('tasks').insert(
        filteredTasks.map((tt) => {
          const isNa = naSet.has(tt.id)
          return {
            step_id: stepId,
            project_id: projectId,
            task_order: tt.task_order,
            title: tt.task_title,
            kind: tt.kind,
            type: tt.applies_to_types,
            w_start: tt.w_start,
            w_end: tt.w_end,
            est: tt.est,
            is_milestone: tt.is_milestone,
            status: isNa ? ('na' as const) : ('todo' as const),
            hidden: isNa,
          }
        })
      )

      if (tasksInsertError) {
        console.error('[create_project] tasks insert failed:', tasksInsertError)
        await cleanup()
        return NextResponse.json(
          { ok: false, error: 'Nie udalo sie utworzyc zadan projektu.' },
          { status: 500 }
        )
      }
    }

    // 5. P12: Klocki cykliczne — spread instancji po osi czasu projektu (D-038, D-043)
    const projectDurationWeeks = maxWEnd > 0 ? maxWEnd : 12

    type RecurringTemplate = {
      id: string; phase_number: number; phase_name: string; step_order: number
      step_title: string; kind: string | null
      recurring_period: string | null; recurring_anchor_day: number | null
    }

    const { data: recurringTemplates } = await supabase
      .from('step_templates')
      .select('id, phase_number, phase_name, step_order, step_title, kind, recurring_period, recurring_anchor_day')
      .eq('is_recurring', true) as { data: RecurringTemplate[] | null }

    if (recurringTemplates && recurringTemplates.length > 0) {
      const startDateObj = new Date(start_date)
      const rangeEnd = new Date(startDateObj.getTime() + (projectDurationWeeks + 4) * 7 * 864e5)

      const { data: calRows } = await supabase
        .from('working_calendar')
        .select('day')
        .gte('day', start_date)
        .lte('day', rangeEnd.toISOString().slice(0, 10))
        .eq('is_working_day', false)

      const nonWorkingDays = new Set<string>((calRows ?? []).map(r => r.day as string))

      const isNonWorking = (d: Date): boolean => {
        const dow = d.getDay()
        if (dow === 0 || dow === 6) return true
        return nonWorkingDays.has(d.toISOString().slice(0, 10))
      }

      const getOccurrenceWeek = (baseWeek: number, anchorDay: number): number | null => {
        const weekStartMs = startDateObj.getTime() + (baseWeek - 1) * 7 * 864e5
        const weekStart = new Date(weekStartMs)
        const wsISO = weekStart.getDay() === 0 ? 7 : weekStart.getDay()
        const dayOffset = (anchorDay - wsISO + 7) % 7
        let target = new Date(weekStartMs + dayOffset * 864e5)
        for (let i = 0; isNonWorking(target) && i < 4; i++) {
          target = new Date(target.getTime() + 864e5)
        }
        const resultWeek = Math.floor((target.getTime() - startDateObj.getTime()) / (7 * 864e5)) + 1
        return resultWeek >= 1 && resultWeek <= projectDurationWeeks ? resultWeek : null
      }

      for (const rt of recurringTemplates) {
        if (!rt.recurring_period) continue
        const periodWeeks = rt.recurring_period === 'biweekly' ? 2 : 1
        const anchorDay = rt.recurring_anchor_day ?? 4
        let occIdx = 0

        for (let w = 1; w <= projectDurationWeeks; w += periodWeeks) {
          const targetWeek = getOccurrenceWeek(w, anchorDay)
          occIdx++
          if (targetWeek === null) continue

          const { data: rsStep, error: rsErr } = await supabase
            .from('project_steps')
            .insert({
              project_id: projectId,
              step_template_id: rt.id,
              phase_number: 99,
              phase_name: 'Klocki cykliczne',
              step_order: rt.step_order * 1000 + occIdx,
              step_title: rt.step_title,
              kind: rt.kind ?? 'pm',
              is_recurring: true,
              is_parallel: false,
              is_decision: false,
              status: 'todo',
              is_active: false,
            } as never)
            .select('id')
            .single()

          if (rsErr || !rsStep) {
            console.error('[create_project] recurring step insert failed:', rsErr)
            continue
          }

          await supabase.from('tasks').insert({
            step_id: (rsStep as { id: string }).id,
            project_id: projectId,
            task_order: 1,
            title: rt.step_title,
            kind: 'pm',
            type: [],
            w_start: targetWeek,
            w_end: targetWeek,
            est: null,
            is_milestone: false,
            status: 'todo',
            hidden: false,
          })
        }
      }
    }

    // 6. Seed standardowych milestones MS0–MS7 (best-effort, nie blokuje)
    const STANDARD_MILESTONES = [
      { ms_code: 'MS0', name: 'Kick-off zakończony',                       week: 1  },
      { ms_code: 'MS1', name: 'Discovery i audyt zakończony',              week: 3  },
      { ms_code: 'MS2', name: 'Architektura i projekt zatwierdzone',       week: 5  },
      { ms_code: 'MS3', name: 'Sprint 1 — konfiguracja zakończona',        week: 7  },
      { ms_code: 'MS4', name: 'Sprint 2 — konfiguracja zakończona',        week: 9  },
      { ms_code: 'MS5', name: 'UAT passed — odbiór klienta',               week: 11 },
      { ms_code: 'MS6', name: 'Go-live',                                   week: 13 },
      { ms_code: 'MS7', name: 'Hypercare zakończony — projekt zamknięty',  week: 14 },
    ]
    try {
      await supabase.from('milestones' as never).insert(
        STANDARD_MILESTONES.map(m => ({ ...m, project_id: projectId, status: 'on' }))
      )
    } catch { /* non-blocking — nie blokuje create_project */ }

    // 7. Activity log (nieblokujace)
    const { error: logError } = await supabase.from('activity_log').insert({
      entity: 'project',
      entity_id: projectId,
      action: 'create_project',
      actor_id: userId,
      before: null,
      after: { name, client_id, types, start_date },
    })
    if (logError) {
      console.error('[create_project] activity_log insert failed:', logError)
    }

    return NextResponse.json({
      ok: true,
      data: {
        project_id: projectId,
        project_url: `https://bw-project-manager.vercel.app/projects/${projectId}`,
      }
    })
  } catch (err) {
    console.error('[create_project] Unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
