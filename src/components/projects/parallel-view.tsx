// Nie 'use client' — komponent prezentacyjny, kompatybilny z server components.

import { cn } from '@/lib/utils'
import type { GanttStep, ProjectDetail } from '@/lib/data/projects'

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Decision = ProjectDetail['decisions'][number]

export interface ParallelViewProps {
  steps: GanttStep[]
  decisions?: Decision[]
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

/** Zlicz zadania w kroku wg statusu (for_quality i na pominięte z „gotowe"). */
function countTasks(step: GanttStep) {
  let total = 0
  let done = 0
  let inProgress = 0
  let estSum = 0

  for (const task of step.tasks) {
    if (task.isMilestone) continue // milestony nie liczą się jako zadania
    if (task.status === 'na') continue // „nie dotyczy" — poza liczbą zadań
    total++
    if (task.status === 'done') done++
    if (task.status === 'in_progress') inProgress++
    if (task.est !== null) estSum += task.est
  }

  return { total, done, inProgress, estSum }
}

/** Etykiety statusu kroku (do pilla). */
const STEP_STATUS_LABEL: Record<GanttStep['status'], string> = {
  todo: 'do zrobienia',
  in_progress: 'w toku',
  done: 'gotowe',
  skipped: 'pominięty',
}

const STEP_STATUS_PILL: Record<GanttStep['status'], string> = {
  todo: 'bg-muted text-muted-foreground border border-border',
  in_progress: 'bg-status-quality/15 text-status-quality border border-status-quality/30',
  done: 'bg-teal/15 text-teal-strong border border-teal/25',
  skipped: 'bg-muted/50 text-muted-foreground/60 border border-border/50',
}

/** Znak „równolegle" (‖) renderowany jako dwa paski — niezależny od glifu czcionki. */
function ParallelMark() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-[2px] align-middle mr-0.5">
      <span className="block w-[2px] h-3 rounded-full bg-current" />
      <span className="block w-[2px] h-3 rounded-full bg-current" />
    </span>
  )
}

/** Skróty etykiet decyzji widocznych w kroku. */
const DECISION_LABELS: Record<Decision['type'], string> = {
  uat: 'UAT?',
  change_request: 'CR?',
  deviation: 'Odchylenie?',
  other: 'Decyzja?',
}

// ─── Kolumna równoległej fazy ─────────────────────────────────────────────────

interface ParallelColumnProps {
  step: GanttStep
  stepDecisions: Decision[]
}

function ParallelColumn({ step, stepDecisions }: ParallelColumnProps) {
  const { total, done, inProgress, estSum } = countTasks(step)
  const isActive = step.isActive
  const isRecurring = step.isRecurring

  // Pill statusu wynika z realnego status kroku (nie zgadujemy „w toku").
  const statusLabel = STEP_STATUS_LABEL[step.status]

  // Widoczne decyzje dla tego kroku
  const visibleDecisions = stepDecisions.filter((d) => d.stepId === step.id)
  const decisionLabels = visibleDecisions.map((d) => DECISION_LABELS[d.type]).join(' · ')

  return (
    <div className="rounded-md border border-teal/30 overflow-hidden">
      {/* Nagłówek kolumny */}
      <h4
        className={cn(
          'flex justify-between items-center gap-2',
          'bg-teal/10 px-3 py-2 font-heading font-semibold text-[12.5px] text-teal-strong'
        )}
      >
        <span className="flex items-center truncate min-w-0">
          {isActive ? (
            <span aria-hidden="true" className="mr-1 text-[10px]">▶</span>
          ) : (
            <ParallelMark />
          )}
          <span className="truncate">F{step.phaseNumber} — {step.phaseName}</span>
        </span>

        {/* Pille: status + (opcjonalnie) „cyklicznie" */}
        <span className="flex-shrink-0 inline-flex items-center gap-1">
          {isRecurring && (
            <span className="inline-flex items-center rounded-full border border-teal/20 bg-teal/10 px-2 py-0.5 font-heading text-[10px] font-semibold text-teal-strong whitespace-nowrap">
              cyklicznie
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold whitespace-nowrap',
              STEP_STATUS_PILL[step.status]
            )}
          >
            {statusLabel}
          </span>
        </span>
      </h4>

      {/* Ciało kolumny */}
      <div className="px-3 py-2.5 text-xs text-muted-foreground space-y-1">
        {total > 0 ? (
          <>
            <p>
              <span className="text-foreground/70">{total}</span> zadań
              {' · '}
              <span className="text-foreground/70">{done}</span> gotowe
              {' · '}
              <span className="text-foreground/70">{inProgress}</span> w toku
              {estSum > 0 && (
                <>
                  {' · '}
                  <span className="font-mono text-foreground/70">Σ {estSum}h</span>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground/60 italic">Brak zadań w tej fazie.</p>
        )}

        {visibleDecisions.length > 0 && (
          <p className="text-spo font-heading font-semibold text-[10px]">
            Widoczne decyzje: {decisionLabels}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── ParallelView ─────────────────────────────────────────────────────────────

/**
 * Widok krocków równoległych (Realizacja ∥ Kontrola, R3).
 * Pokazuje union { isActive } ∪ { isParallel }, aktywne pierwsze, maks 2 widoczne.
 *
 * Props:
 *   steps      — lista kroków GanttStep z @/lib/data/projects
 *   decisions  — (opcjonalne) lista decyzji do wyświetlenia w kolumnach
 */
export function ParallelView({ steps, decisions = [] }: ParallelViewProps) {
  // Union aktywnych i równoległych kroków, dedupe po id, aktywne pierwsze.
  const activeSteps = steps.filter((s) => s.isActive)
  const parallelSteps = steps.filter((s) => s.isParallel && !s.isActive)

  // Dedupe: aktywne pierwsze, potem równoległe (aktywne już wykluczone z parallelSteps)
  const combined = [...activeSteps, ...parallelSteps]

  // Pokaż maks. 2 kolumny; reszta dostępna przez strip
  const visible = combined.slice(0, 2)

  if (visible.length === 0) {
    return (
      <div
        className={cn(
          'rounded-md border border-border/50 px-4 py-3',
          'text-xs text-muted-foreground/60 italic text-center'
        )}
      >
        Brak aktywnej fazy.
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3',
        visible.length >= 2 && 'md:grid-cols-2'
      )}
      aria-label="Równoległe fazy projektu"
    >
      {visible.map((step) => (
        <ParallelColumn
          key={step.id}
          step={step}
          stepDecisions={decisions}
        />
      ))}
    </div>
  )
}
