'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronRight, Repeat, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDetail, GanttStep, GanttTask, TaskStatus, TaskKind, MilestoneStatus, DecisionStatus, DecisionType } from '@/lib/data/projects'

// ─── Stałe ────────────────────────────────────────────────────────────────────

const LABEL_COL_WIDTH = 240 // px — szerokość kolumny etykiety fazy

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

/** Upewnij się że kolumna gridu jest w zakresie [1, weekCount] (1-indexed). */
function clampWeek(week: number | null, weekCount: number): number | null {
  if (week === null) return null
  const clamped = Math.max(1, Math.min(week, weekCount))
  return clamped
}

/** Przelicz tydzień (1-indexed) na kolumnę CSS grid (tydzień k → kolumna k+1, bo col 1 = etykieta). */
function weekToGridCol(week: number): number {
  return week + 1
}

/** gridColumn CSS: [wStart+1] / [wEnd+2]. */
function barGridColumn(wStart: number, wEnd: number): string {
  return `${weekToGridCol(wStart)} / ${weekToGridCol(wEnd) + 1}`
}

/** Parsuj 'YYYY-MM-DD' jako datę LOKALNĄ o północy (nie UTC) — spójnie z `today` lokalnym. */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Formatuje etykietę tygodnia:
 *  - jeśli calendarStart → realna data (calendarStart + (k-1)*7 dni)
 *  - inaczej → "T{k}"
 */
function weekLabel(k: number, calendarStart: string | null): string {
  if (!calendarStart) return `T${k}`
  try {
    const base = parseLocalDate(calendarStart)
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (k - 1) * 7)
    return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit' }).format(date)
  } catch {
    return `T${k}`
  }
}

/** Oblicz numer tygodnia "dziś" (1-indexed) względem calendarStart. null gdy poza zakresem. */
function todayWeekNumber(calendarStart: string | null, weekCount: number): number | null {
  if (!calendarStart) return null
  try {
    const base = parseLocalDate(calendarStart)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Diff w pełnych dniach na datach lokalnych (bez mieszania UTC/lokalny → bez off-by-one).
    const dayMs = 24 * 60 * 60 * 1000
    const diffDays = Math.floor((today.getTime() - base.getTime()) / dayMs)
    const week = Math.floor(diffDays / 7) + 1
    if (week < 1 || week > weekCount) return null
    return week
  } catch {
    return null
  }
}

/** Suma est zadań w kroku (filtrujemy null, zwracamy >0 albo null). */
function stepEstSum(tasks: GanttTask[]): number | null {
  const sum = tasks.reduce((acc, t) => acc + (t.est ?? 0), 0)
  return sum > 0 ? sum : null
}

// ─── Badge statusu zadania ─────────────────────────────────────────────────────

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Do zrobienia',
  in_progress: 'W toku',
  done: 'Gotowe',
  for_quality: 'QA',
  na: 'N/D',
}

const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-teal/10 text-teal border-teal/30',
  done: 'bg-teal/15 text-teal-strong border-teal/25',
  for_quality: 'bg-status-quality/10 text-status-quality border-status-quality/25',
  na: 'bg-muted/60 text-muted-foreground/60 border-border/50 line-through',
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[0.6rem] font-medium leading-none',
        TASK_STATUS_CLASSES[status]
      )}
    >
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}

// ─── Etykieta rodzaju zadania ─────────────────────────────────────────────────

const TASK_KIND_LABEL: Record<TaskKind, string> = {
  ws: 'warsztat',
  own: 'własne',
  config: 'konfiguracja',
  test: 'test',
  ms: 'kamień',
  pm: 'PM',
}

// ─── Etykiety decyzji (PL) ──────────────────────────────────────────────────────

const DECISION_TYPE_LABEL: Record<DecisionType, string> = {
  uat: 'UAT',
  change_request: 'Change request',
  deviation: 'Odchylenie',
  other: 'Inna',
}

const DECISION_STATUS_LABEL: Record<DecisionStatus, string> = {
  pending: 'oczekuje',
  yes: 'robimy',
  no: 'pomijamy',
}

// ─── Kolory paska kroku wg status ─────────────────────────────────────────────

function stepBarClasses(status: GanttStep['status']): string {
  switch (status) {
    case 'done':
      return 'bg-teal/15 dark:bg-teal/25 border border-teal/40 dark:border-teal/60 text-teal-strong'
    case 'in_progress':
      return 'bg-teal border-teal text-white'
    case 'skipped':
      return 'bg-muted/50 border border-border text-muted-foreground/60 line-through'
    case 'todo':
    default:
      return 'bg-muted border border-border text-muted-foreground'
  }
}

// ─── Kolory diamenciku decyzji wg status ──────────────────────────────────────

function decisionBorderClass(status: DecisionStatus): string {
  switch (status) {
    case 'pending':
      return 'border-status-at'
    case 'yes':
      return 'border-teal'
    case 'no':
      return 'border-muted-foreground/40'
  }
}

// ─── Kolory rombu milestone wg status ─────────────────────────────────────────

function milestoneBgClass(status: MilestoneStatus): string {
  switch (status) {
    case 'done':
      return 'bg-teal'
    case 'at':
      return 'bg-status-at'
    case 'off':
      return 'bg-status-off'
    case 'on':
    default:
      return 'bg-foreground/40'
  }
}

// ─── Wiersz zadania (rozwinięty) ───────────────────────────────────────────────

function TaskRow({ task }: { task: GanttTask }) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-1 pl-3 pr-2 text-xs text-muted-foreground border-b border-border/30 last:border-0">
      {/* Kamień milowy */}
      {task.isMilestone && (
        <Flag
          size={11}
          aria-hidden="true"
          className="shrink-0 text-teal"
        />
      )}

      {/* Tytuł zadania */}
      <span className="min-w-0 w-[44ch] max-w-[44ch] truncate text-foreground/80 font-medium">
        {task.title}
      </span>

      {/* Badge statusu */}
      <TaskStatusBadge status={task.status} />

      {/* Rodzaj */}
      <span
        className="text-[0.6rem] text-muted-foreground/70 uppercase"
        title={TASK_KIND_LABEL[task.kind]}
      >
        {task.kind}
      </span>

      {/* Szacowany czas */}
      {task.est != null && (
        <span className="text-[0.6rem] tabular-nums text-muted-foreground/70">
          {task.est}h
        </span>
      )}

      {/* Przypisana osoba */}
      <span className="text-[0.6rem] text-muted-foreground/60 truncate max-w-[10ch]">
        {task.assigneeName ?? '—'}
      </span>
    </li>
  )
}

// ─── Wiersz kroku Gantta ───────────────────────────────────────────────────────

interface StepRowProps {
  step: GanttStep
  weekCount: number
  decisions: ProjectDetail['decisions']
  isExpanded: boolean
  onToggle: () => void
}

function StepRow({ step, weekCount, decisions, isExpanded, onToggle }: StepRowProps) {
  const gridCols = `${LABEL_COL_WIDTH}px repeat(${weekCount}, minmax(44px, 1fr))`

  // Clamp wStart/wEnd do zakresu
  const wStart = clampWeek(step.wStart, weekCount)
  const wEnd = clampWeek(step.wEnd, weekCount)
  const hasBar = wStart !== null && wEnd !== null
  const hasTasks = step.tasks.length > 0

  const estSum = stepEstSum(step.tasks)

  // Decyzje powiązane z tym krokiem
  const stepDecisions = decisions.filter((d) => d.stepId === step.id)

  const rowId = `step-tasks-${step.id}`

  return (
    <div className="group">
      {/* Wiersz gridu — etykieta + pasek */}
      <div
        className="grid items-center min-h-[40px] border-b border-border/40 hover:bg-muted/30 transition-colors"
        style={{ gridTemplateColumns: gridCols }}
      >
        {/* Kolumna etykiety fazy (kolumna 1) — sticky left, przymrożona.
            z-10 > paski (brak z) i overlay "dziś" (z-[5]) — przewijają się pod etykietą.
            bg-card + group-hover:bg-muted/40 zapewnia nieprzezroczyste tło przy hover. */}
        <button
          type="button"
          onClick={hasTasks ? onToggle : undefined}
          aria-expanded={hasTasks ? isExpanded : undefined}
          aria-controls={hasTasks ? rowId : undefined}
          aria-label={hasTasks ? `${isExpanded ? 'Zwiń' : 'Rozwiń'} krok: ${step.stepTitle}` : step.stepTitle}
          className={cn(
            'sticky left-0 z-10 flex items-center gap-1.5 px-2 py-1.5 overflow-hidden w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-colors',
            hasTasks
              ? 'cursor-pointer bg-card group-hover:bg-muted/40 hover:bg-muted/50'
              : 'cursor-default bg-card group-hover:bg-muted/40'
          )}
        >
          {/* Ikona chevron — tylko gdy są zadania do rozwinięcia */}
          <span aria-hidden="true" className="shrink-0 flex items-center justify-center w-5 h-5 text-muted-foreground">
            {hasTasks && (
              <ChevronRight
                size={12}
                className={cn('transition-transform duration-200', isExpanded && 'rotate-90')}
              />
            )}
          </span>

          {/* Numer fazy + tytuł */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[0.65rem] font-semibold text-teal shrink-0">
                F{step.phaseNumber}
              </span>
              <span className="text-xs font-medium text-foreground truncate">
                {step.stepTitle}
              </span>
            </div>

            {/* Tagi: równolegle / cykliczny */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {step.isParallel && (
                <span className="text-[0.6rem] font-medium text-teal/80 uppercase tracking-wide leading-none">
                  ∥ równolegle
                </span>
              )}
              {step.isRecurring && (
                <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground/70 uppercase leading-none">
                  <Repeat size={8} aria-hidden="true" />
                  cykliczny
                </span>
              )}
              {/* Diamenciki decyzji */}
              {stepDecisions.map((dec) => (
                <span
                  key={dec.id}
                  title={`Decyzja (${DECISION_TYPE_LABEL[dec.type]}): ${dec.title} — ${DECISION_STATUS_LABEL[dec.status]}`}
                  aria-label={`Decyzja: ${dec.title}`}
                  className={cn(
                    'inline-block size-2.5 rotate-45 border-2 shrink-0',
                    decisionBorderClass(dec.status)
                  )}
                />
              ))}
            </div>
          </div>
        </button>

        {/* Pasek klocka lub „brak zadań" */}
        {hasBar ? (
          <div
            role="button"
            tabIndex={-1}
            onClick={onToggle}
            aria-hidden="true"
            className={cn(
              'relative flex items-center px-2 h-7 rounded-md text-[0.65rem] font-medium overflow-hidden select-none cursor-pointer',
              stepBarClasses(step.status),
              // Aktywny krok: teal ring — bez dodatkowego z-index, zostaje pod sticky etykietą (z-10)
              step.isActive && 'ring-2 ring-teal ring-offset-1'
            )}
            style={{ gridColumn: barGridColumn(wStart, wEnd) }}
          >
            {/* Pill "Tu jesteś" dla aktywnego kroku */}
            {step.isActive && (
              <span className="mr-1.5 shrink-0 inline-flex items-center rounded-full bg-teal px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-white leading-none whitespace-nowrap">
                Tu jesteś
              </span>
            )}

            {/* Nazwa fazy (truncated) */}
            <span className="truncate">{step.phaseName}</span>

            {/* Suma godzin */}
            {estSum !== null && (
              <span className="ml-1.5 shrink-0 opacity-75 tabular-nums">
                {estSum}h
              </span>
            )}
          </div>
        ) : (
          // Krok bez zadań — zajmuje całą szerokość osi (kolumny 2..N+1)
          <div
            className="px-2 py-1 col-span-full text-[0.65rem] text-muted-foreground/60 italic"
            style={{ gridColumn: `2 / ${weekCount + 2}` }}
          >
            brak zadań w tej fazie
          </div>
        )}
      </div>

      {/* Lista zadań — rozwijana */}
      {step.tasks.length > 0 && (
        <div
          id={rowId}
          role="region"
          aria-label={`Zadania: ${step.stepTitle}`}
          // sticky+szerokość na WRAPPERZE (nie na <ul>): overflow-hidden więzi sticky
          // dzieci, więc to wrapper musi być przyklejony do lewej — inaczej tytuły
          // zadań uciekają poza ekran po przewinięciu osi.
          className={cn(
            'sticky left-0 z-10 overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out',
            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          )}
          style={{ width: `min(100%, ${LABEL_COL_WIDTH + 560}px)` }}
        >
          <ul className="mx-0 mb-0 border-b border-border/40 bg-card">
            {step.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Komponent główny: GanttChart ──────────────────────────────────────────────

interface GanttChartProps {
  project: ProjectDetail
}

export function GanttChart({ project }: GanttChartProps) {
  const { steps, milestones, decisions, weekCount, calendarStart } = project

  // Stan rozwinięć kroków
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // Ref do kontenera scroll (P1a)
  const scrollRef = useRef<HTMLDivElement>(null)

  function toggleStep(stepId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const gridCols = `${LABEL_COL_WIDTH}px repeat(${weekCount}, minmax(44px, 1fr))`

  // Tydzień "dziś" (1-indexed, null gdy poza zakresem lub bez calendarStart)
  const todayWeek = todayWeekNumber(calendarStart, weekCount)

  // Auto-scroll do aktywnego/dzisiejszego tygodnia po montażu (P1a).
  // Mierzy RZECZYWISTĄ szerokość kolumny tygodnia z DOM zamiast zakładać stałą.
  useEffect(() => {
    const activeStep = steps.find((s) => s.isActive)
    const targetWeek = activeStep?.wStart ?? todayWeek
    if (targetWeek === null || targetWeek === undefined) return
    const el = scrollRef.current
    if (!el) return
    // Rzeczywista szerokość N kolumn tygodniowych = scrollWidth minus kolumna etykiety.
    const timelineWidth = el.scrollWidth - LABEL_COL_WIDTH
    const colWidth = timelineWidth / weekCount
    // Pozycja lewej krawędzi docelowego tygodnia (0-indexed w przestrzeni scroll).
    const target = LABEL_COL_WIDTH + (targetWeek - 1) * colWidth
    // Widoczna szerokość obszaru tygodni (bez etykiety).
    const visibleTimeline = el.clientWidth - LABEL_COL_WIDTH
    // Centruj aktywny tydzień ~1/3 od lewej krawędzi obszaru tygodni.
    el.scrollLeft = Math.max(0, target - LABEL_COL_WIDTH - visibleTimeline / 3)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Milestones z sensownym tygodniem
  const validMilestones = milestones.filter(
    (m) => m.week !== null && m.week >= 1 && m.week <= weekCount
  )

  // Decyzje nieprzypisane do żadnego kroku — nie mogą zniknąć (P11)
  const unassignedDecisions = decisions.filter((d) => d.stepId === null)

  // Tygodnie 1..N
  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1)

  return (
    <section
      aria-label="Wykres Gantta projektu"
      className="rounded-[10px] border border-border bg-card shadow-whisper overflow-hidden"
    >
      {/* Przewijanie poziome na wąskich ekranach */}
      <div ref={scrollRef} className="overflow-x-auto relative">
        {/* Minimum-width wrapper — zapewnia że linia "dziś" obejmuje pełną szerokość siatki */}
        <div className="min-w-max relative">

          {/* ── Nakładka "linia dziś" — pionowa kreska pod nagłówkiem ──────── */}
          {/* z-[5]: pod etykietami kroków (z-10) i pod nagłówkiem (z-20/z-30).
              Paski klocków nie mają z-index → też pod etykietą. Kolejność warstw:
              paski/overlay-dziś (brak z / z-[5]) < etykiety kroków/lista zadań (z-10) < nagłówek tygodni (z-20) < etykieta "Faza" w nagłówku (z-30). */}
          {todayWeek !== null && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid z-[5]"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div /> {/* puste miejsce na kolumnę etykiety */}
              {weeks.map((k) =>
                k === todayWeek ? (
                  <div key={k} className="relative">
                    {/* Pionowa kreska na pełną wysokość wiersza (klapa nagłówka zakrywa jej górę — to pożądane) */}
                    <div className="absolute inset-x-0 top-0 bottom-0 flex justify-center">
                      <div className="w-px bg-teal/35" />
                    </div>
                  </div>
                ) : (
                  <div key={k} />
                )
              )}
            </div>
          )}

          {/* ── Nagłówek tygodni (sticky top) ───────────────────────────────── */}
          <div
            className="sticky top-0 z-20 grid bg-background border-b border-border shadow-whisper-md"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Etykieta nagłówka — sticky left wewnątrz sticky-top.
                z-30 > z-20 (reszta nagłówka) > z-10 (etykiety kroków) — komórka zawsze na wierzchu. */}
            <div className="sticky left-0 z-30 bg-background px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Faza
            </div>
            {/* Komórki tygodni */}
            {weeks.map((k) => (
              <div
                key={k}
                className={cn(
                  'px-1 py-2 text-center text-[0.6rem] font-medium text-muted-foreground border-l border-border/40',
                  k === todayWeek && 'text-teal font-semibold'
                )}
              >
                {weekLabel(k, calendarStart)}
                {/* Etykieta "dziś" w nagłówku — zawsze widoczna (jest w z-20 sticky warstwie) */}
                {k === todayWeek && (
                  <span className="block mt-0.5 mx-auto w-fit rounded-sm px-1 py-px text-[0.5rem] font-bold uppercase tracking-wide bg-teal text-white leading-tight">
                    dziś
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── Wiersz kamieni milowych ─────────────────────────────────────── */}
          {validMilestones.length > 0 && (
            <div
              className="grid items-center min-h-[32px] border-b border-border/40 bg-background/60"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* Etykieta "Kamienie" — sticky left z-10, bg-background (nie /60 — musi być nieprzezroczyste).
                  z-10 zapewnia że tygodnie i romby przewijają się pod etykietą. */}
              <div className="sticky left-0 z-10 bg-background px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Kamienie
                <span className="block font-meta text-[0.55rem] font-normal normal-case tracking-normal text-muted-foreground/70">
                  ◆ kamień · ◇ decyzja
                </span>
              </div>
              {/* Komórki z rombami */}
              {weeks.map((k) => {
                const msInWeek = validMilestones.filter((m) => m.week === k)
                return (
                  <div
                    key={k}
                    className="border-l border-border/40 flex items-center justify-center gap-1 py-1"
                  >
                    {msInWeek.map((ms) => (
                      <span
                        key={ms.id}
                        title={[ms.msCode, ms.name].filter(Boolean).join(': ')}
                        aria-label={[ms.msCode, ms.name].filter(Boolean).join(': ')}
                        className={cn(
                          'inline-block size-3 rotate-45 shrink-0',
                          milestoneBgClass(ms.status)
                        )}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Wiersze kroków ────────────────────────────────────────────────── */}
          <div>
            {steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                weekCount={weekCount}
                decisions={decisions}
                isExpanded={expandedSteps.has(step.id)}
                onToggle={() => toggleStep(step.id)}
              />
            ))}
          </div>

          {/* Decyzje nieprzypisane do kroku (P11) — nie pozwalamy im zniknąć */}
          {unassignedDecisions.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 bg-muted/20 px-4 py-3">
              <span className="font-meta text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Decyzje (nieprzypisane)
              </span>
              {unassignedDecisions.map((dec) => (
                <span key={dec.id} className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
                  <span
                    aria-hidden="true"
                    className={cn('inline-block size-2.5 rotate-45 border-2 shrink-0', decisionBorderClass(dec.status))}
                  />
                  <span className="truncate max-w-[28ch]">{dec.title}</span>
                  <span className="font-meta text-[0.6rem] text-muted-foreground">
                    {DECISION_TYPE_LABEL[dec.type]} · {DECISION_STATUS_LABEL[dec.status]}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Pusta tabelka gdy brak kroków */}
          {steps.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Brak kroków dla tego projektu.
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
