'use client'

import { type CSSProperties, useState, useEffect, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ProjectDetail,
  GanttTask,
  TaskKind,
  MilestoneStatus,
  GanttStep,
  ImplType,
} from '@/lib/data/projects'
import { TaskStatusControl } from '@/components/projects/task-status-control'
import { TaskAssigneeControl, type Profile } from '@/components/projects/task-assignee-control'
import { TaskPmControl, type Profile as PmProfile } from '@/components/projects/task-pm-control'
import { TaskDateControl } from '@/components/projects/task-date-control'
import { muteTaskWarning } from '@/lib/actions/tasks'
import { TaskEstControl } from '@/components/projects/task-est-control'

// ─── Stałe szerokości kolumn (muszą być identyczne w ghead i każdym wierszu grow) ─

const COL = {
  id: 'w-[42px] shrink-0 text-center',
  task: 'flex-1 min-w-[200px]',
  kind: 'w-[72px] shrink-0 text-center',
  typ: 'w-[44px] shrink-0 text-center',
  est: 'w-[48px] shrink-0 text-center',
  own: 'w-[52px] shrink-0 text-center',
  wk: 'flex-1 min-w-[220px] shrink-0',   // obszar tygodni (osobny sub-grid)
  st: 'w-[76px] shrink-0 text-center',
} as const

// ─── Kolory KIND (paleta data-viz — kategoryczna, dozwolone hex wg spec) ─────────

const KIND_COLOR: Record<TaskKind, string> = {
  ws: '#185FA5',       // warsztat — niebieski
  own: '#E06C1A',      // własna — ciepły pomarańcz (odsunięcie od orange=#F94213 = akcja per DESIGN.md)
  config: '#28B39B',   // config — teal
  test: '#EF9F27',     // testy — amber
  pm: '#9DA8A5',       // PM — szary
  ms: '#8257E6',       // kamień — fiolet SPO (używamy w gbar jeśli zadanie isMilestone)
}

// ─── Kolory ImplType (chipy Typ) ──────────────────────────────────────────────────

const IMPL_TYPE_COLOR: Record<ImplType, string> = {
  CRM: '#28B39B',
  SPO: '#8257E6',
  INT: '#378ADD',
  MKT: '#EF7DAE',
  ERP: '#EF9F27',
}

const KIND_LABEL: Record<TaskKind, string> = {
  ws: 'warsztat',
  own: 'własna',
  config: 'config',
  test: 'testy',
  pm: 'PM',
  ms: 'kamień',
}

// Statusy zadania renderuje teraz interaktywny TaskStatusControl (P7) — patrz task-status-control.tsx.

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
    if (Number.isNaN(week) || week < 1 || week > weekCount) return null
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

/** Czy zadanie jest po terminie (ma due_date < dziś i nie jest done/na).
 *  Data wyliczana per-wywołanie żeby nie starzała się po restarcie serwera. */
function isOverdue(task: GanttTask): boolean {
  const todayISO = new Date().toISOString().slice(0, 10)
  return (
    task.dueDate !== null &&
    task.dueDate < todayISO &&
    task.status !== 'done' &&
    task.status !== 'na'
  )
}

/** Liczba dni do terminu (lokalna strefa; ujemna = po terminie). */
function daysUntilDue(dueDateISO: string): number {
  const d = parseLocalDate(dueDateISO)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - now.getTime()) / 86400000)
}

/**
 * P10: Czy zadanie jest „wkrótce po terminie" (≤ 2 dni, nie ukończone, nie wyciszone).
 * Żółty alert — ostrzeżenie przed przekroczeniem terminu.
 */
function isSoonDue(task: GanttTask): boolean {
  if (!task.dueDate || task.status === 'done' || task.status === 'na' || task.warningMuted) return false
  const d = daysUntilDue(task.dueDate)
  return d >= 0 && d <= 2
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

/** Suma est zadań w kroku (pomijamy null). */
function totalEst(tasks: GanttTask[]): number {
  return tasks.reduce((acc, t) => acc + (t.est ?? 0), 0)
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

// ─── Subkomponent: chipy ImplType ────────────────────────────────────────────────

function ImplTypeChips({ types }: { types: ImplType[] }) {
  if (!types.length) return null
  return (
    <span className="inline-flex flex-wrap gap-0.5 items-center justify-center">
      {types.map((t) => (
        <span
          key={t}
          className="rounded px-1 text-[0.5rem] font-heading font-semibold text-white leading-none py-0.5"
          style={{ backgroundColor: IMPL_TYPE_COLOR[t] }}
        >
          {t}
        </span>
      ))}
    </span>
  )
}

/** Formatuje 'YYYY-MM-DD' → 'dd.MM.YYYY' (polskie). */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ─── Komponent główny: GanttChart ──────────────────────────────────────────────

interface GanttChartProps {
  project: ProjectDetail
  profiles?: Profile[]
  pmProfiles?: PmProfile[]
  targetStepId?: string | null
  onTargetConsumed?: () => void
}

export function GanttChart({ project, profiles = [], pmProfiles = [], targetStepId, onTargetConsumed }: GanttChartProps) {
  const { steps, milestones, weekCount, calendarStart } = project
  const router = useRouter()
  const [, startTransition] = useTransition()

  // P19: Wyciszenie alertu — wywołuje server action + odświeża dane
  async function handleMute(taskId: string) {
    startTransition(async () => {
      await muteTaskWarning(taskId)
      router.refresh()
    })
  }

  // Tydzień "dziś" (1-indexed, null gdy poza zakresem lub bez calendarStart)
  const todayWeek = todayWeekNumber(calendarStart, weekCount)

  // ── FIX 1: Stan zwijania faz ─────────────────────────────────────────────────
  // Domyślnie: zwinięte wszystkie fazy POZA aktywnymi (isActive) i in_progress.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    return new Set(
      steps
        .filter((s) => !s.isActive && s.status !== 'in_progress')
        .map((s) => s.id)
    )
  })

  function togglePhase(stepId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  function expandAll() {
    setCollapsed(new Set())
  }

  function collapseAll() {
    setCollapsed(new Set(steps.map((s) => s.id)))
  }

  // ── P9: toggle „Pokaż N ukrytych" ───────────────────────────────────────────
  const [showHidden, setShowHidden] = useState(false)

  // ── Filtr „Po terminie" ──────────────────────────────────────────────────────
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false)

  // ── Statystyki (memoized — nie przeliczaj przy każdym render stanu UI) ────────

  const { allTasks, regularTasks, hiddenTaskCount, estSum, overdueCount, doneCount } = useMemo(() => {
    const allTasks = steps.flatMap((s) => s.tasks)
    const regularTasks = allTasks.filter((t) => !t.isMilestone && !t.hidden)
    const hiddenTaskCount = allTasks.filter((t) => !t.isMilestone && t.hidden).length
    return {
      allTasks,
      regularTasks,
      hiddenTaskCount,
      estSum: totalEst(regularTasks),
      overdueCount: regularTasks.filter(isOverdue).length,
      doneCount: regularTasks.filter((t) => t.status === 'done').length,
    }
  }, [steps])

  // Auto-zamknij toggle gdy nie ma już żadnych ukrytych zadań
  useEffect(() => {
    if (hiddenTaskCount === 0) setShowHidden(false)
  }, [hiddenTaskCount])

  // ── Klik klocka → rozwiń i scrolluj do fazy ───────────────────────────────────
  useEffect(() => {
    if (!targetStepId) return
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(targetStepId)
      return next
    })
    const timer = setTimeout(() => {
      document.getElementById(`gantt-phase-${targetStepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
    onTargetConsumed?.()
    return () => clearTimeout(timer)
  }, [targetStepId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Budowanie struktur (memoized — zależy tylko od danych, nie od UI state) ────

  type PhaseGroup = {
    step: GanttStep
    regularTasks: GanttTask[]
    hiddenTasks: GanttTask[]
    assignedMs: typeof milestones
  }

  const { phaseGroups, tailMs } = useMemo(() => {
    // Przypisanie kamienia do fazy (1. zawierająca, 2. ostatnia zaczęta, 3. tail)
    const msAssignment = new Map<string, string>()
    for (const ms of milestones) {
      if (ms.week === null || ms.week < 1 || ms.week > weekCount) continue
      const w = ms.week
      let containing: GanttStep | null = null
      let lastStarted: GanttStep | null = null
      for (const s of steps) {
        if (s.wStart === null) continue
        if (s.wStart <= w) lastStarted = s
        if (containing === null && s.wEnd !== null && s.wStart <= w && w <= s.wEnd) containing = s
      }
      const target = containing ?? lastStarted
      if (target) msAssignment.set(ms.id, target.id)
    }

    const phaseGroups: PhaseGroup[] = steps.map((step) => {
      const stepRegular = step.tasks.filter((t) => !t.isMilestone && !t.hidden)
      const stepHidden = step.tasks.filter((t) => !t.isMilestone && t.hidden)
      return {
        step,
        regularTasks: showOnlyOverdue ? stepRegular.filter(isOverdue) : stepRegular,
        hiddenTasks: showOnlyOverdue ? stepHidden.filter(isOverdue) : stepHidden,
        assignedMs: milestones.filter((ms) => msAssignment.get(ms.id) === step.id),
      }
    })

    const tailMs = milestones.filter((ms) => !msAssignment.has(ms.id))
    return { phaseGroups, tailMs }
  }, [steps, milestones, weekCount, showOnlyOverdue])

  // ── Tygodnie 1..N (memoized) ─────────────────────────────────────────────────

  const weeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i + 1),
    [weekCount]
  )

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
            Zadania gotowe
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {doneCount} / {regularTasks.length}
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
        <button
          type="button"
          onClick={() => setShowOnlyOverdue((v) => !v)}
          className={cn(
            'border rounded-[9px] px-4 py-3 bg-card border-t-[3px] border-t-status-off text-left transition-all',
            'cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
            showOnlyOverdue
              ? 'border-status-off/60 shadow-sm'
              : 'border-border'
          )}
          aria-pressed={showOnlyOverdue}
          title={showOnlyOverdue ? 'Kliknij, aby wyczyścić filtr' : 'Kliknij, aby filtrować zadania po terminie'}
        >
          <div className="text-[0.625rem] font-heading font-semibold uppercase tracking-[.05em] text-muted-foreground">
            Po terminie
          </div>
          <div className="font-heading font-bold text-[1.5rem] mt-0.5 leading-tight">
            {overdueCount}
          </div>
        </button>
      </div>

      {/* ── Tabela Gantta ─────────────────────────────────────────────────────── */}
      <div
        className="border border-border rounded-[9px] overflow-hidden shadow-whisper"
        role="region"
        aria-label="Tabela harmonogramu"
      >
        {/* Przyciski Rozwiń/Zwiń + P9 „Pokaż ukryte" */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-muted/20">
          <button
            type="button"
            onClick={expandAll}
            className="text-[0.6rem] font-heading font-semibold text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-muted"
          >
            Rozwiń wszystko
          </button>
          <span className="text-muted-foreground/40 text-[0.6rem]">·</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[0.6rem] font-heading font-semibold text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-muted"
          >
            Zwiń wszystko
          </button>
          {hiddenTaskCount > 0 && (
            <>
              <span className="text-muted-foreground/40 text-[0.6rem]">·</span>
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                className={cn(
                  'text-[0.6rem] font-heading font-semibold transition-colors rounded px-1.5 py-0.5',
                  showHidden
                    ? 'text-teal bg-teal/10 hover:bg-teal/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                aria-pressed={showHidden}
              >
                {showHidden
                  ? `Ukryj N/D (${hiddenTaskCount})`
                  : `Pokaż N/D (${hiddenTaskCount})`}
              </button>
            </>
          )}
          {showOnlyOverdue && (
            <>
              <span className="text-muted-foreground/40 text-[0.6rem]">·</span>
              <span className="inline-flex items-center gap-1 text-[0.6rem] font-heading font-semibold text-status-off bg-status-off/10 rounded px-1.5 py-0.5">
                Filtr: Po terminie
                <button
                  type="button"
                  onClick={() => setShowOnlyOverdue(false)}
                  aria-label="Wyczyść filtr po terminie"
                  className="ml-0.5 hover:text-status-off/70 transition-colors"
                >
                  ×
                </button>
              </span>
            </>
          )}
        </div>

        {/* Poziomy scroll na wąskich ekranach */}
        <div className="overflow-x-auto">
          {/* min-w-max zapewnia że tygodnie nie zbijają się poniżej 28px */}
          <div className="min-w-max" role="table" aria-label="Harmonogram zadań">

            {/* ── Nagłówek .ghead ─────────────────────────────────────────────── */}
            {/* Tło #222B28 wg makiety; tekst jasny; font-heading 10px */}
            <div
              role="row"
              aria-label="Nagłówek tabeli"
              className="flex items-stretch dark:border-b dark:border-white/10 sticky top-0 z-30"
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
              {/* Typ (Kind) */}
              <div
                role="columnheader"
                className={cn(COL.kind, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Typ
              </div>
              {/* Impl */}
              <div
                role="columnheader"
                className={cn(COL.typ, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Impl
              </div>
              {/* Est. */}
              <div
                role="columnheader"
                className={cn(COL.est, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Est.
              </div>
              {/* Kons. / PM */}
              <div
                role="columnheader"
                className={cn(COL.own, 'px-1 py-2 text-[0.625rem] font-heading font-semibold')}
              >
                Kons/PM
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
                      style={k !== todayWeek ? { color: '#9fc5bd' } : undefined}
                    >
                      <span className="font-heading font-semibold">{lbl.t}</span>
                      {lbl.date && (
                        <span className="mt-0.5 text-[0.5rem] opacity-70">{lbl.date}</span>
                      )}
                      {k === todayWeek && (
                        <span className="mt-0.5 rounded-sm px-0.5 py-px text-[0.45rem] font-heading font-bold uppercase tracking-wide leading-none text-white bg-teal">
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

            {/* ── Wiersze tabeli (owinięte w relative dla overlay „dziś") ──────── */}
            {phaseGroups.length === 0 && tailMs.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Brak kroków dla tego projektu.
              </div>
            )}

            {/* FIX 2: kontener relative dla jednego ciągłego overlay „dziś" */}
            <div className="relative" role="rowgroup">

              {/* ── FIX 2: Overlay linia „dziś" — JEDEN element, cała wysokość ── */}
              {todayWeek !== null && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none z-20 flex"
                >
                  {/* Spacery = stałe kolumny przed obszarem tygodni */}
                  <div className={cn(COL.id, 'shrink-0')} />
                  <div className={cn(COL.task, 'shrink-0')} />
                  <div className={cn(COL.kind, 'shrink-0')} />
                  <div className={cn(COL.typ, 'shrink-0')} />
                  <div className={cn(COL.est, 'shrink-0')} />
                  <div className={cn(COL.own, 'shrink-0')} />
                  {/* Kontener tygodni — grid identyczny jak w wierszach */}
                  <div
                    className={cn(COL.wk, 'shrink-0')}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                    }}
                  >
                    {weeks.map((k) => (
                      <div
                        key={k}
                        className={cn(
                          'h-full',
                          k === todayWeek ? 'flex justify-center' : ''
                        )}
                      >
                        {k === todayWeek && (
                          <div
                            className="mx-auto h-full bg-teal/70"
                            style={{ width: '1.5px' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Spacer = COL.st */}
                  <div className={cn(COL.st, 'shrink-0')} />
                </div>
              )}

              {/* ── Wiersze per-faza (grouped) ───────────────────────────────── */}
              {phaseGroups.map(({ step, regularTasks: phaseTasks, hiddenTasks: phaseHiddenTasks, assignedMs }) => {
                const isCollapsed = collapsed.has(step.id)
                const phaseTaskCount = phaseTasks.length
                const phaseEstSum = totalEst(phaseTasks)
                // Dla nagłówka zwiniętego: liczba "done" spośród wszystkich zadań w fazie (visible)
                const allPhaseRegular = step.tasks.filter((t) => !t.isMilestone && !t.hidden)
                const phaseDoneCount = allPhaseRegular.filter((t) => t.status === 'done').length
                const phaseTotalCount = allPhaseRegular.length

                return (
                  <div key={`phase-group-${step.id}`}>

                    {/* ── Wiersz fazy — klikalny, zawsze widoczny ─────────────── */}
                    <div
                      id={`gantt-phase-${step.id}`}
                      role="row"
                      aria-label={`Faza: ${step.stepTitle}`}
                      className="flex items-center min-h-[36px] border-t border-border/40 bg-muted/50"
                    >
                      {/* # — chevron + numer fazy (klikalny przycisk) */}
                      <button
                        type="button"
                        onClick={() => togglePhase(step.id)}
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Rozwiń' : 'Zwiń'} fazę: ${step.stepTitle}`}
                        className={cn(
                          COL.id,
                          'flex items-center justify-center gap-0.5 px-1 py-1.5',
                          'font-mono text-[0.6rem] text-muted-foreground',
                          'hover:text-foreground transition-colors cursor-pointer',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
                          'rounded'
                        )}
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            'h-3 w-3 shrink-0 transition-transform motion-reduce:transition-none',
                            !isCollapsed && 'rotate-90',
                          )}
                        />
                        <span>{step.phaseNumber}</span>
                      </button>

                      {/* Zadanie / Faza — bold, heading; zwiniete = skrót */}
                      <div
                        role="cell"
                        className={cn(
                          COL.task,
                          'px-2.5 py-1.5 font-heading font-bold text-[0.7rem] text-foreground flex items-center gap-2'
                        )}
                      >
                        <span>FAZA {step.phaseNumber} — {step.phaseName}</span>
                        {isCollapsed && phaseTotalCount > 0 && (
                          <span className="text-[0.6rem] font-normal font-mono text-muted-foreground shrink-0">
                            {phaseDoneCount}/{phaseTotalCount} gotowe
                            {phaseEstSum > 0 && ` · ${phaseEstSum}h`}
                          </span>
                        )}
                      </div>
                      {/* Kind — puste */}
                      <div role="cell" className={COL.kind} />
                      {/* Typ — puste */}
                      <div role="cell" className={COL.typ} />
                      {/* Est — puste */}
                      <div role="cell" className={COL.est} />
                      {/* Own — puste */}
                      <div role="cell" className={COL.own} />
                      {/* Obszar tygodni — linie podziału + opcjonalny cienki pasek fazy gdy zwinięta */}
                      <div
                        role="cell"
                        className={cn(COL.wk, 'h-[36px]')}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                          gridTemplateRows: '1fr',
                        }}
                      >
                        {weeks.map((k) => (
                          <div
                            key={k}
                            aria-hidden="true"
                            className="border-l border-border/25 h-full"
                            style={{ gridRow: 1 }}
                          />
                        ))}
                        {/* Cienki pasek fazy na osi gdy zwinięta — daje obraz rozłożenia w czasie */}
                        {isCollapsed && step.wStart !== null && step.wEnd !== null && (() => {
                          const wS = clampWeek(step.wStart, weekCount)
                          const wE = clampWeek(step.wEnd, weekCount)
                          if (wS === null || wE === null) return null
                          return (
                            <div
                              aria-hidden="true"
                              className="h-1 rounded-full bg-teal/40 self-center"
                              style={{ gridColumn: `${wS} / ${wE + 1}`, gridRow: 1 }}
                            />
                          )
                        })()}
                      </div>
                      {/* Status — puste */}
                      <div role="cell" className={COL.st} />
                    </div>

                    {/* ── Zawartość fazy: zadania + milestony (gdy rozwinięta) ── */}
                    {!isCollapsed && (
                      <>
                        {/* Zadania fazy */}
                        {phaseTasks.map((task, idx) => {
                          const wStartC = clampWeek(task.wStart, weekCount)
                          const wEndC = clampWeek(task.wEnd, weekCount)
                          const hasBar = wStartC !== null && wEndC !== null
                          const taskIdx = idx + 1

                          const taskIsOverdue = isOverdue(task)
                          const taskIsSoon = isSoonDue(task)
                          const barColor = taskIsOverdue
                            ? 'var(--status-off)'
                            : taskIsSoon
                              ? 'var(--status-at)'
                              : KIND_COLOR[task.kind]

                          return (
                            <div
                              key={`task-${task.id}`}
                              role="row"
                              aria-label={task.title}
                              className={cn(
                                'flex items-center min-h-[36px] border-t border-border/30 hover:bg-muted/20 transition-colors',
                                taskIsSoon && 'bg-status-at/5',
                                task.warningMuted && 'opacity-60',
                              )}
                            >
                              {/* # — phaseNumber.taskIdx (mono) */}
                              <div
                                role="cell"
                                className={cn(
                                  COL.id,
                                  'px-1.5 py-1.5 font-mono text-[0.6rem] text-muted-foreground'
                                )}
                              >
                                {step.phaseNumber}.{taskIdx}
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
                              {/* Typ — kolorowe chipy ImplType */}
                              <div
                                role="cell"
                                className={cn(
                                  COL.typ,
                                  'px-1 py-1.5 flex items-center justify-center'
                                )}
                              >
                                <ImplTypeChips types={task.types} />
                              </div>
                              {/* Est. — edytowalne inline */}
                              <div
                                role="cell"
                                className={cn(COL.est, 'px-0.5 py-1 flex items-center justify-center')}
                              >
                                <TaskEstControl taskId={task.id} est={task.est} />
                              </div>
                              {/* Own — konsultant + PM nadzorujący */}
                              <div
                                role="cell"
                                className={cn(COL.own, 'px-0.5 py-1 flex items-center justify-center gap-1')}
                              >
                                <TaskAssigneeControl
                                  taskId={task.id}
                                  assigneeName={task.assigneeName}
                                  specialists={profiles}
                                />
                                <TaskPmControl
                                  taskId={task.id}
                                  pmAssigneeId={task.pmAssigneeId}
                                  profiles={pmProfiles}
                                />
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
                                {/* Pionowe linie tygodni — bez segmentów teal (overlay) */}
                                {weeks.map((k) => (
                                  <div
                                    key={k}
                                    aria-hidden="true"
                                    className="border-l border-border/25 h-full"
                                    style={{ gridRow: 1 }}
                                  />
                                ))}
                                {/* Pasek .gbar — kolor wg kind */}
                                {hasBar && (
                                  <div
                                    aria-hidden="true"
                                    style={{ ...barGridColumn(wStartC!, wEndC!, barColor), gridRow: 1 }}
                                  />
                                )}
                              </div>
                              {/* Status (P7) + termin klikalny (P18) + data ukończenia (P8) + wyciszanie (P19) */}
                              <div
                                role="cell"
                                className={cn(COL.st, 'px-1.5 py-1 flex flex-col items-center gap-0.5')}
                              >
                                <TaskStatusControl taskId={task.id} status={task.status} />
                                {task.status === 'done' && task.completionDate ? (
                                  <span
                                    className="text-[0.5rem] font-mono text-teal-strong/70 leading-none"
                                    title={`Ukończono: ${formatDate(task.completionDate)}`}
                                  >
                                    ✓ {formatDate(task.completionDate)}
                                  </span>
                                ) : (
                                  <TaskDateControl
                                    taskId={task.id}
                                    dueDate={task.dueDate}
                                    alertLevel={taskIsOverdue ? 'overdue' : taskIsSoon ? 'soon' : undefined}
                                  />
                                )}
                                {/* P19: Przycisk wyciszenia — widoczny gdy aktywny alert i nie jest wyciszony */}
                                {(taskIsOverdue || taskIsSoon) && !task.warningMuted && (
                                  <button
                                    type="button"
                                    onClick={() => handleMute(task.id)}
                                    className="text-[0.55rem] font-meta text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-muted"
                                  >
                                    Wycisz
                                  </button>
                                )}
                                {/* P19: Etykieta wyciszonego alertu */}
                                {task.warningMuted && (
                                  <span className="text-[0.5rem] font-meta text-muted-foreground/60 leading-none">
                                    wyciszony
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* P9: ukryte zadania fazy — widoczne gdy showHidden=true */}
                        {showHidden && phaseHiddenTasks.map((task, idx) => {
                          const wStartC = clampWeek(task.wStart, weekCount)
                          const wEndC = clampWeek(task.wEnd, weekCount)
                          const hasBar = wStartC !== null && wEndC !== null
                          const taskIdx = phaseTasks.length + idx + 1

                          return (
                            <div
                              key={`task-hidden-${task.id}`}
                              role="row"
                              aria-label={`[N/D] ${task.title}`}
                              className="flex items-center min-h-[34px] border-t border-dashed border-border/20 opacity-50"
                            >
                              <div role="cell" className={cn(COL.id, 'px-1.5 py-1 font-mono text-[0.6rem] text-muted-foreground/60')}>
                                {step.phaseNumber}.{taskIdx}
                              </div>
                              <div role="cell" className={cn(COL.task, 'px-2.5 py-1 text-[0.7rem] text-muted-foreground line-through truncate')} title={task.title}>
                                {task.title}
                              </div>
                              <div role="cell" className={cn(COL.kind, 'px-1 py-1 flex items-center justify-center')}>
                                <KindChip kind={task.kind} />
                              </div>
                              <div role="cell" className={cn(COL.typ, 'px-1 py-1 flex items-center justify-center')}>
                                <ImplTypeChips types={task.types} />
                              </div>
                              <div role="cell" className={cn(COL.est, 'px-0.5 py-1 flex items-center justify-center')}>
                                <TaskEstControl taskId={task.id} est={task.est} />
                              </div>
                              <div role="cell" className={cn(COL.own, 'px-0.5 py-1 flex items-center justify-center gap-1')}>
                                <TaskAssigneeControl taskId={task.id} assigneeName={task.assigneeName} specialists={profiles} />
                                <TaskPmControl taskId={task.id} pmAssigneeId={task.pmAssigneeId} profiles={pmProfiles} />
                              </div>
                              <div role="cell" className={cn(COL.wk, 'h-[34px]')} style={{ display: 'grid', gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`, gridTemplateRows: '1fr' }}>
                                {weeks.map((k) => (
                                  <div key={k} aria-hidden="true" className="border-l border-border/15 h-full" style={{ gridRow: 1 }} />
                                ))}
                                {hasBar && (
                                  <div aria-hidden="true" style={{ ...barGridColumn(wStartC!, wEndC!, 'var(--muted-foreground)'), opacity: 0.3, gridRow: 1 }} />
                                )}
                              </div>
                              <div role="cell" className={cn(COL.st, 'px-1.5 py-1 flex items-center justify-center')}>
                                <TaskStatusControl taskId={task.id} status={task.status} />
                              </div>
                            </div>
                          )
                        })}

                        {/* Milestony przypisane do tej fazy */}
                        {assignedMs.map((ms) => (
                          <div
                            key={`ms-${ms.id}`}
                            role="row"
                            aria-label={`Kamień milowy: ${ms.name}`}
                            className="flex items-center min-h-[36px] border-t border-border/30 border-l-2 border-l-status-at/60 bg-status-at/10 dark:bg-status-at/20"
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
                              <span
                                aria-hidden="true"
                                className="shrink-0 inline-block rotate-45 rounded-[2px] bg-status-at"
                                style={{ width: 9, height: 9, minWidth: 9 }}
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
                            {/* Obszar tygodni — tylko linie */}
                            <div
                              role="cell"
                              className={cn(COL.wk, 'h-[36px]')}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                              }}
                            >
                              {weeks.map((k) => (
                                <div
                                  key={k}
                                  aria-hidden="true"
                                  className="border-l border-border/25 h-full"
                                />
                              ))}
                            </div>
                            {/* Status — pill */}
                            <div
                              role="cell"
                              className={cn(COL.st, 'px-1.5 py-1.5 flex items-center justify-center')}
                            >
                              <MsStatusPill status={ms.status} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                  </div>
                )
              })}

              {/* ── Milestony tail (poza zakresem faz) — zawsze widoczne ─────── */}
              {tailMs.map((ms) => (
                <div
                  key={`ms-tail-${ms.id}`}
                  role="row"
                  aria-label={`Kamień milowy: ${ms.name}`}
                  className="flex items-center min-h-[36px] border-t border-border/30 border-l-2 border-l-status-at/60 bg-status-at/10 dark:bg-status-at/20"
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
                    <span
                      aria-hidden="true"
                      className="shrink-0 inline-block rotate-45 rounded-[2px] bg-status-at"
                      style={{ width: 9, height: 9, minWidth: 9 }}
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
                  {/* Obszar tygodni — tylko linie */}
                  <div
                    role="cell"
                    className={cn(COL.wk, 'h-[36px]')}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${weekCount}, minmax(28px, 1fr))`,
                    }}
                  >
                    {weeks.map((k) => (
                      <div
                        key={k}
                        aria-hidden="true"
                        className="border-l border-border/25 h-full"
                      />
                    ))}
                  </div>
                  {/* Status — pill */}
                  <div
                    role="cell"
                    className={cn(COL.st, 'px-1.5 py-1.5 flex items-center justify-center')}
                  >
                    <MsStatusPill status={ms.status} />
                  </div>
                </div>
              ))}

            </div>{/* koniec .relative (overlay) */}

            {/* karty msgrid pod tabelą — opcjonalne (Faza 3) */}

          </div>
        </div>
      </div>
    </section>
  )
}
