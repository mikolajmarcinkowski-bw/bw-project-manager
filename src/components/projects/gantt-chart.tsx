'use client'

import { type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type {
  ProjectDetail,
  GanttTask,
  TaskStatus,
  TaskKind,
  MilestoneStatus,
} from '@/lib/data/projects'

// ─── Stałe szerokości kolumn (muszą być identyczne w ghead i każdym wierszu grow) ─

const COL = {
  id: 'w-[42px] shrink-0 text-center',
  task: 'flex-1 min-w-[200px]',
  kind: 'w-[72px] shrink-0 text-center',
  typ: 'w-[44px] shrink-0 text-center',
  est: 'w-[40px] shrink-0 text-right',
  own: 'w-[38px] shrink-0 text-center',
  wk: 'flex-1 min-w-[220px] shrink-0',   // obszar tygodni (osobny sub-grid)
  st: 'w-[76px] shrink-0 text-center',
} as const

// ─── Kolory KIND (paleta data-viz — kategoryczna, dozwolone hex wg spec) ─────────

const KIND_COLOR: Record<TaskKind, string> = {
  ws: '#185FA5',       // warsztat — niebieski
  own: '#F94213',      // własna — orange (UWAGA: to action-orange; makieta celowo go używa dla „własna" — zachowano dla wierności 1:1 z ekranem 6)
  config: '#28B39B',   // config — teal
  test: '#EF9F27',     // testy — amber
  pm: '#9DA8A5',       // PM — szary
  ms: '#8257E6',       // kamień — fiolet SPO (używamy w gbar jeśli zadanie isMilestone)
}

const KIND_LABEL: Record<TaskKind, string> = {
  ws: 'warsztat',
  own: 'własna',
  config: 'config',
  test: 'testy',
  pm: 'PM',
  ms: 'kamień',
}

// ─── Statusy zadania ──────────────────────────────────────────────────────────────

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'plan',
  in_progress: 'w toku',
  done: 'gotowe',
  for_quality: 'QA',
  na: 'N/D',
}

const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-teal/10 text-teal',
  done: 'bg-teal/15 text-teal-strong',
  for_quality: 'bg-status-quality/15 text-status-quality',
  na: 'bg-muted/50 text-muted-foreground/60 line-through',
}

// ─── Statusy milestona ────────────────────────────────────────────────────────────

const MS_STATUS_LABEL: Record<MilestoneStatus, string> = {
  done: '✓',
  on: 'plan',
  at: 'ryzyko',
  off: 'opóźniony',
}

const MS_STATUS_CLASSES: Record<MilestoneStatus, string> = {
  done: 'bg-teal/15 text-teal-strong',
  on: 'bg-muted text-muted-foreground',
  at: 'bg-status-at/15 text-status-at',
  off: 'bg-status-off/15 text-status-off',
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────────

/** Parsuj 'YYYY-MM-DD' jako datę LOKALNĄ o północy (nie UTC). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Oblicz numer tygodnia "dziś" (1-indexed) względem calendarStart. null gdy poza zakresem. */
function todayWeekNumber(calendarStart: string | null, weekCount: number): number | null {
  if (!calendarStart) return null
  try {
    const base = parseLocalDate(calendarStart)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayMs = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((today.getTime() - base.getTime()) / dayMs)
    const week = Math.floor(diffDays / 7) + 1
    if (week < 1 || week > weekCount) return null
    return week
  } catch {
    return null
  }
}

/**
 * Etykieta tygodnia w nagłówku:
 *  - jeśli calendarStart → `T{k}` + `dd.MM` daty początku tygodnia
 *  - inaczej → `T{k}`
 */
function weekLabel(k: number, calendarStart: string | null): { t: string; date: string | null } {
  if (!calendarStart) return { t: `T${k}`, date: null }
  try {
    const base = parseLocalDate(calendarStart)
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (k - 1) * 7)
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return { t: `T${k}`, date: `${dd}.${mm}` }
  } catch {
    return { t: `T${k}`, date: null }
  }
}

/** Clamp wartość tygodnia do [1, weekCount]; null → null. */
function clampWeek(week: number | null, weekCount: number): number | null {
  if (week === null) return null
  return Math.max(1, Math.min(week, weekCount))
}

/**
 * Styl CSS paska .gbar jako dziecko gridu tygodni.
 * Wzór: gridColumn `${wStart} / ${wEnd + 1}` (koniec wykluczający).
 * Element nie jest absolute — dzięki temu uczestniczy w flow gridu i gridColumn działa poprawnie.
 */
function barGridColumn(wStart: number, wEnd: number, color: string): CSSProperties {
  return {
    gridColumn: `${wStart} / ${wEnd + 1}`,
    alignSelf: 'center',
    height: 12,
    borderRadius: 9999,
    backgroundColor: color,
    zIndex: 10,
    pointerEvents: 'none',
  }
}

/** Inicjały z imienia i nazwiska (max 2 znaki). */
function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '').toUpperCase()
}

/** Suma est zadań w kroku (pomijamy null). */
function totalEst(tasks: GanttTask[]): number {
  return tasks.reduce((acc, t) => acc + (t.est ?? 0), 0)
}

// ─── Subkomponent: pill statusu zadania ──────────────────────────────────────────

function TaskStatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold font-heading leading-none',
        TASK_STATUS_CLASSES[status]
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}

// ─── Subkomponent: pill statusu milestona ────────────────────────────────────────

function MsStatusPill({ status }: { status: MilestoneStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold font-heading leading-none',
        MS_STATUS_CLASSES[status]
      )}
    >
      {MS_STATUS_LABEL[status]}
    </span>
  )
}

// ─── Subkomponent: chip kind ──────────────────────────────────────────────────────

function KindChip({ kind }: { kind: TaskKind }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[0.58rem] font-heading font-semibold leading-none text-white"
      style={{ backgroundColor: KIND_COLOR[kind] }}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

// ─── Subkomponent: avatar inicjałów ──────────────────────────────────────────────

function Avatar({ name }: { name: string | null }) {
  const ini = initials(name)
  if (ini === '—') {
    return <span className="text-[0.65rem] text-muted-foreground">—</span>
  }
  return (
    <span
      className="inline-grid place-items-center rounded-full bg-muted border border-border font-heading font-semibold text-[0.55rem] text-muted-foreground"
      style={{ width: 20, height: 20 }}
      title={name ?? undefined}
      aria-label={name ?? undefined}
    >
      {ini}
    </span>
  )
}

// ─── Komponent główny: GanttChart ──────────────────────────────────────────────

interface GanttChartProps {
  project: ProjectDetail
}

export function GanttChart({ project }: GanttChartProps) {
  const { steps, milestones, weekCount, calendarStart } = project

  // Tydzień "dziś" (1-indexed, null gdy poza zakresem lub bez calendarStart)
  const todayWeek = todayWeekNumber(calendarStart, weekCount)

  // ── Statystyki ───────────────────────────────────────────────────────────────

  const allTasks = steps.flatMap((s) => s.tasks)
  const regularTasks = allTasks.filter((t) => !t.isMilestone)
  const estSum = totalEst(regularTasks)

  // ── Budowanie listy wierszy (faza → zadania → milestony po fazie) ────────────

  // Każdy milestone przypisujemy do fazy o największym wEnd <= ms.week.
  // Null-guard: wEnd === null traktujemy jako -∞ (nie może wygrać vs realny tydzień).
  // Milestony bez week (null) i poza zakresem → do puli "tail" (koniec listy).

  type RowKind =
    | { type: 'phase'; step: typeof steps[0] }
    | { type: 'task'; task: GanttTask; phaseNumber: number; taskIdx: number }
    | { type: 'ms'; ms: typeof milestones[0] }

  const rows: RowKind[] = []
  const tailMs: typeof milestones[0][] = []

  // Kopie milestones — będziemy je oznaczać jako użyte
  const unusedMs = new Set(milestones.map((m) => m.id))

  for (const step of steps) {
    // Wiersz fazy
    rows.push({ type: 'phase', step })

    // Wiersze zadań (bez isMilestone — te żyją jako wiersze ms)
    const regularStepTasks = step.tasks.filter((t) => !t.isMilestone)
    regularStepTasks.forEach((task, idx) => {
      rows.push({ type: 'task', task, phaseNumber: step.phaseNumber, taskIdx: idx + 1 })
    })

    // Milestony przypisane do tej fazy:
    // ms.week jest w zakresie i ta faza ma największe wEnd <= ms.week (spośród wszystkich faz)
    for (const ms of milestones) {
      if (!unusedMs.has(ms.id)) continue
      if (ms.week === null || ms.week < 1 || ms.week > weekCount) continue

      // Czy ta faza jest "najlepszym kandydatem" (największe wEnd <= ms.week)?
      const msWeek = ms.week
      const stepWEnd = step.wEnd  // może być null

      // Sprawdź czy bieżąca faza kwalifikuje się (wEnd != null && wEnd <= ms.week)
      if (stepWEnd === null || stepWEnd > msWeek) continue

      // Sprawdź czy istnieje lepsza faza (wEnd > stepWEnd && wEnd <= ms.week)
      const betterStepExists = steps.some((other) => {
        if (other.id === step.id) return false
        const otherEnd = other.wEnd
        if (otherEnd === null) return false  // null-guard: null != lepsze
        return otherEnd > stepWEnd && otherEnd <= msWeek
      })
      if (betterStepExists) continue

      rows.push({ type: 'ms', ms })
      unusedMs.delete(ms.id)
    }
  }

  // Milestony które nie zostały przypisane → tail
  for (const ms of milestones) {
    if (unusedMs.has(ms.id)) {
      tailMs.push(ms)
    }
  }
  tailMs.forEach((ms) => rows.push({ type: 'ms', ms }))

  // ── Tygodnie 1..N ────────────────────────────────────────────────────────────

  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section aria-label="Wykres Gantta projektu" className="flex flex-col gap-4">

      {/* ── 4 statystyki ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3" role="region" aria-label="Statystyki harmonogramu">
        <div className="border border-border rounded-[9px] px-4 py-3 bg-card border-t-[3px] border-t-teal">
          <div className="text-[0.625rem] font-heading font-semibold uppercase tracking-[.05em] text-muted-foreground">
            Estymacja (h)
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {estSum > 0 ? estSum : 0}
          </div>
        </div>
        <div className="border border-border rounded-[9px] px-4 py-3 bg-card border-t-[3px] border-t-foreground">
          <div className="text-[0.625rem] font-heading font-semibold uppercase tracking-[.05em] text-muted-foreground">
            Zadania
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {regularTasks.length}
          </div>
        </div>
        <div className="border border-border rounded-[9px] px-4 py-3 bg-card border-t-[3px] border-t-status-at">
          <div className="text-[0.625rem] font-heading font-semibold uppercase tracking-[.05em] text-muted-foreground">
            Kamienie
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {milestones.length}
          </div>
        </div>
        <div className="border border-border rounded-[9px] px-4 py-3 bg-card border-t-[3px] border-t-status-off">
          <div className="text-[0.625rem] font-heading font-semibold uppercase tracking-[.05em] text-muted-foreground">
            Po terminie
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {/* brak due_date w danych — pokaż 0 (TODO: uzupełnić gdy dane będą miały due_date, Faza 2c) */}
            0
          </div>
        </div>
      </div>

      {/* ── Tabela Gantta ─────────────────────────────────────────────────────── */}
      <div
        className="border border-border rounded-[9px] overflow-hidden shadow-whisper"
        role="region"
        aria-label="Tabela harmonogramu"
      >
        {/* Poziomy scroll na wąskich ekranach */}
        <div className="overflow-x-auto">
          {/* min-w-max zapewnia że tygodnie nie zbijają się poniżej 28px */}
          <div className="min-w-max">

            {/* ── Nagłówek .ghead ─────────────────────────────────────────────── */}
            {/* Tło #222B28 wg makiety; tekst jasny; font-heading 10px */}
            <div
              role="row"
              aria-label="Nagłówek tabeli"
              className="flex items-stretch"
              style={{ backgroundColor: '#222B28', color: '#EAF2F0' }}
            >
              {/* # */}
              <div
                role="columnheader"
                className={cn(COL.id, 'px-1.5 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                #
              </div>
              {/* Zadanie / Faza */}
              <div
                role="columnheader"
                className={cn(COL.task, 'px-2.5 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Zadanie / Faza
              </div>
              {/* Kind */}
              <div
                role="columnheader"
                className={cn(COL.kind, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Kind
              </div>
              {/* Typ */}
              <div
                role="columnheader"
                className={cn(COL.typ, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Typ
              </div>
              {/* Est. */}
              <div
                role="columnheader"
                className={cn(COL.est, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Est.
              </div>
              {/* Own */}
              <div
                role="columnheader"
                className={cn(COL.own, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Own
              </div>
              {/* Tygodnie */}
              <div
                role="columnheader"
                className={cn(COL.wk, 'flex')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                }}
              >
                {weeks.map((k) => {
                  const lbl = weekLabel(k, calendarStart)
                  return (
                    <div
                      key={k}
                      className={cn(
                        'flex flex-col items-center justify-center px-0.5 py-1.5 border-l leading-none',
                        'text-[0.5rem] font-mono',
                        k === todayWeek
                          ? 'text-teal font-semibold border-teal/40'
                          : 'border-white/8'
                      )}
                      style={{ color: k === todayWeek ? '#28B39B' : '#9fc5bd' }}
                    >
                      <span className="font-heading font-semibold">{lbl.t}</span>
                      {lbl.date && (
                        <span className="mt-0.5 text-[0.45rem] opacity-70">{lbl.date}</span>
                      )}
                      {k === todayWeek && (
                        <span
                          className="mt-0.5 rounded-sm px-0.5 py-px text-[0.4rem] font-heading font-bold uppercase tracking-wide leading-none text-white"
                          style={{ backgroundColor: '#28B39B' }}
                        >
                          dziś
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Status */}
              <div
                role="columnheader"
                className={cn(COL.st, 'px-1.5 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Status
              </div>
            </div>

            {/* ── Wiersze tabeli ───────────────────────────────────────────────── */}
            {rows.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Brak kroków dla tego projektu.
              </div>
            )}

            {rows.map((row, rowIdx) => {
              if (row.type === 'phase') {
                /* ── Wiersz fazy .grow.phase ─────────────────────────────────── */
                const step = row.step
                return (
                  <div
                    key={`phase-${step.id}`}
                    role="row"
                    aria-label={`Faza: ${step.stepTitle}`}
                    className="flex items-center min-h-[36px] border-t border-border/40 bg-muted/50"
                  >
                    {/* # — numer fazy */}
                    <div
                      role="cell"
                      className={cn(
                        COL.id,
                        'px-1.5 py-1.5 font-mono text-[0.6rem] text-muted-foreground'
                      )}
                    >
                      {step.phaseNumber}
                    </div>
                    {/* Zadanie / Faza — bold, heading */}
                    <div
                      role="cell"
                      className={cn(
                        COL.task,
                        'px-2.5 py-1.5 font-heading font-bold text-[0.7rem] text-foreground'
                      )}
                    >
                      FAZA {step.phaseNumber} — {step.phaseName}
                    </div>
                    {/* Kind — puste */}
                    <div role="cell" className={COL.kind} />
                    {/* Typ — puste */}
                    <div role="cell" className={COL.typ} />
                    {/* Est — puste */}
                    <div role="cell" className={COL.est} />
                    {/* Own — puste */}
                    <div role="cell" className={COL.own} />
                    {/* Obszar tygodni — puste (faza nie ma paska) */}
                    <div
                      role="cell"
                      className={cn(COL.wk, 'h-[36px] relative')}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                      }}
                    >
                      {weeks.map((k) => (
                        <div
                          key={k}
                          aria-hidden="true"
                          className={cn(
                            'border-l border-border/25 h-full relative',
                          )}
                        >
                          {k === todayWeek && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex justify-center"
                            >
                              <div className="w-px bg-teal/40" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Status — puste */}
                    <div role="cell" className={COL.st} />
                  </div>
                )
              }

              if (row.type === 'task') {
                /* ── Wiersz zadania .grow ─────────────────────────────────────── */
                const { task, phaseNumber, taskIdx } = row
                const wStartC = clampWeek(task.wStart, weekCount)
                const wEndC = clampWeek(task.wEnd, weekCount)
                const hasBar = wStartC !== null && wEndC !== null
                const barColor = KIND_COLOR[task.kind]

                return (
                  <div
                    key={`task-${task.id}`}
                    role="row"
                    aria-label={task.title}
                    className="flex items-center min-h-[36px] border-t border-border/30 hover:bg-muted/20 transition-colors"
                  >
                    {/* # — phaseNumber.taskIdx (mono) */}
                    <div
                      role="cell"
                      className={cn(
                        COL.id,
                        'px-1.5 py-1.5 font-mono text-[0.6rem] text-muted-foreground'
                      )}
                    >
                      {phaseNumber}.{taskIdx}
                    </div>
                    {/* Zadanie — truncate */}
                    <div
                      role="cell"
                      className={cn(
                        COL.task,
                        'px-2.5 py-1.5 text-[0.7rem] text-foreground/90 truncate'
                      )}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                    {/* Kind — chip kolorowy */}
                    <div
                      role="cell"
                      className={cn(COL.kind, 'px-1 py-1.5 flex items-center justify-center')}
                    >
                      <KindChip kind={task.kind} />
                    </div>
                    {/* Typ — brak pola per-task w GanttTask (typ to pole fazy/projektu) */}
                    <div
                      role="cell"
                      className={cn(
                        COL.typ,
                        'px-1 py-1.5 text-[0.6rem] text-muted-foreground/60 text-center'
                      )}
                    >
                      —
                    </div>
                    {/* Est. — mono */}
                    <div
                      role="cell"
                      className={cn(
                        COL.est,
                        'px-1 py-1.5 font-mono text-[0.65rem] text-muted-foreground'
                      )}
                    >
                      {task.est != null ? `${task.est}h` : '—'}
                    </div>
                    {/* Own — avatar inicjałów */}
                    <div
                      role="cell"
                      className={cn(COL.own, 'px-1 py-1.5 flex items-center justify-center')}
                    >
                      <Avatar name={task.assigneeName} />
                    </div>
                    {/* Obszar tygodni + pasek */}
                    <div
                      role="cell"
                      className={cn(COL.wk, 'h-[36px]')}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                        gridTemplateRows: '1fr',
                      }}
                    >
                      {/* Pionowe linie tygodni — każda komórka zajmuje row 1 */}
                      {weeks.map((k) => (
                        <div
                          key={k}
                          aria-hidden="true"
                          className="border-l border-border/25 h-full relative"
                          style={{ gridRow: 1 }}
                        >
                          {k === todayWeek && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex justify-center"
                            >
                              <div className="w-px bg-teal/40" />
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Pasek .gbar — kolor wg kind; gridColumn: wStart / wEnd+1 */}
                      {hasBar && (
                        <div
                          aria-hidden="true"
                          style={{ ...barGridColumn(wStartC!, wEndC!, barColor), gridRow: 1 }}
                        />
                      )}
                    </div>
                    {/* Status — pill (read-only; zmiana statusu = Faza 2c) */}
                    <div
                      role="cell"
                      className={cn(COL.st, 'px-1.5 py-1.5 flex items-center justify-center')}
                    >
                      <TaskStatusPill status={task.status} />
                    </div>
                  </div>
                )
              }

              if (row.type === 'ms') {
                /* ── Wiersz milestona .grow.ms ────────────────────────────────── */
                const { ms } = row

                return (
                  <div
                    key={`ms-${ms.id}`}
                    role="row"
                    aria-label={`Kamień milowy: ${ms.name}`}
                    // Tło amber-soft wg makiety (.grow.ms)
                    className="flex items-center min-h-[36px] border-t border-border/30 border-l-2 border-l-status-at/60 bg-status-at/10"
                  >
                    {/* # — msCode */}
                    <div
                      role="cell"
                      className={cn(
                        COL.id,
                        'px-1.5 py-1.5 font-mono text-[0.6rem] text-muted-foreground'
                      )}
                    >
                      {ms.msCode ?? 'MS'}
                    </div>
                    {/* Zadanie — romb + nazwa */}
                    <div
                      role="cell"
                      className={cn(
                        COL.task,
                        'px-2.5 py-1.5 text-[0.7rem] font-medium flex items-center gap-1.5'
                      )}
                    >
                      {/* ◆ romb amber wypełniony */}
                      <span
                        aria-hidden="true"
                        className="shrink-0 inline-block rotate-45 rounded-[2px]"
                        style={{
                          width: 9,
                          height: 9,
                          backgroundColor: '#EF9F27',
                          minWidth: 9,
                        }}
                      />
                      <span className="truncate" title={ms.name}>
                        {ms.name}
                      </span>
                    </div>
                    {/* Kind — puste */}
                    <div role="cell" className={COL.kind} />
                    {/* Typ — puste */}
                    <div role="cell" className={COL.typ} />
                    {/* Est — puste */}
                    <div role="cell" className={COL.est} />
                    {/* Own — puste */}
                    <div role="cell" className={COL.own} />
                    {/* Obszar tygodni — tylko linie, bez paska */}
                    <div
                      role="cell"
                      className={cn(COL.wk, 'relative h-[36px]')}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                      }}
                    >
                      {weeks.map((k) => (
                        <div
                          key={k}
                          aria-hidden="true"
                          className="border-l border-border/25 h-full relative"
                        >
                          {k === todayWeek && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex justify-center"
                            >
                              <div className="w-px bg-teal/40" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Status — pill wg milestone.status */}
                    <div
                      role="cell"
                      className={cn(COL.st, 'px-1.5 py-1.5 flex items-center justify-center')}
                    >
                      <MsStatusPill status={ms.status} />
                    </div>
                  </div>
                )
              }

              return null
            })}

            {/*
              Pominięto: „Pokaż N ukrytych" — getProjectDetail nie ładuje zadań hidden=true.
              Toggle wymagałby rozszerzenia data-layer (Faza 2c / P9).
            */}

            {/*
              Pominięto: karty msgrid pod tabelą — priorytet to tabela; msgrid opcjonalne (Faza 2c).
            */}

          </div>
        </div>
      </div>
    </section>
  )
}
