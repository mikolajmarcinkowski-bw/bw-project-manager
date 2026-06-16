'use client'

import { cn } from '@/lib/utils'
import type { GanttStep, ProjectDetail } from '@/lib/data/projects'

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Decision = ProjectDetail['decisions'][number]

export interface PhaseStripProps {
  steps: GanttStep[]
  decisions: Decision[]
  onSelectStep: (stepId: string) => void
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

const DECISION_LABELS: Record<Decision['type'], string> = {
  uat: 'UAT?',
  change_request: 'CR?',
  deviation: 'Odchylenie?',
  other: 'Decyzja?',
}

const DECISION_STATUS_LABELS: Record<Decision['status'], string> = {
  pending: 'oczekuje',
  yes: 'robimy',
  no: 'pomijamy',
}

/** Wyciąga rozróżnik typu „Sprint 1" z nazwy fazy (gdy fazy się powtarzają). */
function sprintHint(step: GanttStep): string | null {
  const m = step.phaseName.match(/\(([^)]+)\)\s*$/)
  return m ? m[1] : null
}

// ─── Klocek fazy ─────────────────────────────────────────────────────────────

interface PhaseBlockProps {
  step: GanttStep
  onClick: () => void
}

function PhaseBlock({ step, onClick }: PhaseBlockProps) {
  const isDone = step.status === 'done'
  const isActive = step.isActive

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Faza ${step.phaseNumber}: ${step.phaseName}${isActive ? ' — aktywna faza' : ''}${isDone ? ' — ukończona' : ''}`}
      className={cn(
        // Bazowy styl klocka — odwzorowanie .pblock
        'group relative flex flex-col justify-center min-w-[96px] rounded-[9px] border bg-card',
        'px-3 py-2.5 shadow-whisper text-left transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/60',
        // Hover lift (nie na active — ma już wyróżnik)
        !isActive && 'hover:shadow-whisper-md hover:-translate-y-px',
        // Ukończona faza — wyszarzona
        isDone && 'bg-muted/40 border-border/60',
        // Aktywna faza — teal border + ring glow
        isActive && [
          'border-2 border-teal ring-2 ring-teal/25',
          'hover:ring-teal/35',
        ],
        // Nieukończona, nieaktywna — domyślny border
        !isDone && !isActive && 'border-border'
      )}
    >
      {/* Pill „TU JESTEŚ" dla aktywnej fazy */}
      {isActive && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-2.5 left-2 bg-teal text-white',
            'rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.04em]',
            'font-heading leading-none'
          )}
        >
          TU JESTEŚ
        </span>
      )}

      {/* Numer fazy — F{n} (+ rozróżnik Sprint, gdy nazwa się powtarza) */}
      <span
        className={cn(
          'font-mono text-[8.5px] leading-none mb-0.5',
          isDone ? 'text-muted-foreground/60' : 'text-muted-foreground'
        )}
      >
        F{step.phaseNumber}
        {sprintHint(step) && <span className="text-teal"> · {sprintHint(step)}</span>}
      </span>

      {/* Nazwa fazy */}
      <span
        className={cn(
          'font-heading font-semibold text-[11.5px] leading-tight line-clamp-2',
          isDone ? 'text-muted-foreground' : isActive ? 'text-teal-strong' : 'text-foreground'
        )}
      >
        {isDone && (
          <span aria-hidden="true" className="mr-0.5">
            ✓{' '}
          </span>
        )}
        {step.phaseName}
      </span>
    </button>
  )
}

// ─── Diamencik decyzji ────────────────────────────────────────────────────────

interface DecisionDiamondProps {
  decision: Decision
  onSelectStep: (stepId: string) => void
}

function DecisionDiamond({ decision, onSelectStep }: DecisionDiamondProps) {
  const label = DECISION_LABELS[decision.type]
  const statusLabel = DECISION_STATUS_LABELS[decision.status]
  const ariaLabel = `${decision.title} — ${statusLabel}`

  return (
    <button
      type="button"
      onClick={() => decision.stepId && onSelectStep(decision.stepId)}
      title={ariaLabel}
      aria-label={ariaLabel}
      className={cn(
        'group flex flex-col items-center justify-center gap-1.5',
        'min-w-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 rounded',
        'transition-opacity duration-200 hover:opacity-80'
      )}
    >
      {/* Romb obrysowany fioletem SPO — NIE wypełniony */}
      <span
        aria-hidden="true"
        className="block size-7 rotate-45 rounded-[4px] border-2 border-spo bg-transparent"
      />
      {/* Etykieta pod rombem */}
      <span
        className={cn(
          'font-heading font-semibold text-[9px] leading-none whitespace-nowrap',
          'text-spo'
        )}
      >
        ◇ {label}
      </span>
    </button>
  )
}

// ─── Strzałka separatora ──────────────────────────────────────────────────────

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="flex-shrink-0 self-center text-muted-foreground/40 text-xs px-0.5 select-none"
    >
      →
    </span>
  )
}

// ─── PhaseStrip ───────────────────────────────────────────────────────────────

/**
 * Poziomy pasek faz projektu z diamencikami decyzji i markerem „TU JESTEŚ".
 *
 * Props:
 *   steps          — lista kroków GanttStep z @/lib/data/projects
 *   decisions      — lista decyzji z ProjectDetail.decisions
 *   onSelectStep   — callback (stepId: string) => void; wołany przy kliknięciu
 *                    klocka lub diamencika (stepId decyzji)
 */
export function PhaseStrip({ steps, decisions, onSelectStep }: PhaseStripProps) {
  // Budujemy uporządkowaną listę elementów paska:
  // każdy krok może mieć dopasowane decyzje (stepId === step.id).
  // Porządek: klocek → [decyzje powiązane z tym krokiem] → strzałka (jeśli nie ostatni).
  // Decyzje z stepId === null nie trafiają na strip (zgodnie ze specyfikacją).

  const decisionsByStepId = new Map<string, Decision[]>()
  for (const dec of decisions) {
    if (dec.stepId) {
      const arr = decisionsByStepId.get(dec.stepId) ?? []
      arr.push(dec)
      decisionsByStepId.set(dec.stepId, arr)
    }
  }

  // Budujemy renderowalne pozycje (bloki + diamenciki) jako płaską listę
  // żeby strzałki wstawić między nimi a nie po każdym kroku.
  type StripItem =
    | { kind: 'step'; step: GanttStep }
    | { kind: 'decision'; decision: Decision }

  const items: StripItem[] = []
  for (const step of steps) {
    items.push({ kind: 'step', step })
    const decs = decisionsByStepId.get(step.id) ?? []
    for (const dec of decs) {
      items.push({ kind: 'decision', decision: dec })
    }
  }

  return (
    <div
      // pt-4 żeby pill „TU JESTEŚ" nie był przycinany przez overflow-x-auto
      className="flex items-stretch overflow-x-auto pb-3 pt-4 gap-0"
      role="navigation"
      aria-label="Ścieżka faz projektu"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        const showArrow = !isLast

        return (
          <div key={item.kind === 'step' ? item.step.id : item.decision.id} className="flex items-stretch">
            {item.kind === 'step' ? (
              <PhaseBlock
                step={item.step}
                onClick={() => onSelectStep(item.step.id)}
              />
            ) : (
              <DecisionDiamond
                decision={item.decision}
                onSelectStep={onSelectStep}
              />
            )}
            {showArrow && <Arrow />}
          </div>
        )
      })}
    </div>
  )
}
