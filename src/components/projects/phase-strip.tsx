'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronUp, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GanttStep, ProjectDetail } from '@/lib/data/projects'
import { DecisionDialog } from '@/components/projects/decision-dialog'
import { TaskStatusControl } from './task-status-control'
import { TaskAssigneeControl, type Specialist } from './task-assignee-control'
import { TaskPmControl, type Profile as PmProfile } from './task-pm-control'
import { TaskEstControl } from './task-est-control'

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Decision = ProjectDetail['decisions'][number]

export interface PhaseStripProps {
  steps: GanttStep[]
  decisions: Decision[]
  onSelectStep: (stepId: string) => void
  onRequestNewCr?: () => void
  specialists?: Specialist[]
  pmProfiles?: PmProfile[]
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
  // Aktywna = ma zadania in_progress/for_quality TERAZ
  // Rozpoczęta = w toku (has_work), ale żadne zadanie nie jest aktualnie in_progress
  const isActive = step.isActive
  const isInProgress = step.status === 'in_progress' // obejmuje też isActive

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Faza ${step.phaseNumber}: ${step.phaseName}${isActive ? ' — aktywna faza' : isInProgress ? ' — w toku' : ''}${isDone ? ' — ukończona' : ''}`}
      className={cn(
        // Bazowy styl klocka
        'group relative flex flex-col justify-center min-w-[96px] rounded-[9px] border bg-card',
        'px-3 py-2.5 shadow-whisper text-left transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/60',
        // Hover lift (nie na active)
        !isInProgress && 'hover:shadow-whisper-md hover:-translate-y-px',
        // Ukończona faza — wyszarzona
        isDone && 'bg-muted/40 border-border/60',
        // Aktywna faza (ma in_progress zadania) — teal border + ring glow
        isActive && [
          'border-2 border-teal ring-2 ring-teal/25',
          'hover:ring-teal/35',
        ],
        // Rozpoczęta ale nie aktywnie (żadne in_progress zadanie) — subtelny amber border
        isInProgress && !isActive && [
          'border-2 border-status-at/60',
        ],
        // Nieukończona, nie w toku — domyślny border
        !isDone && !isInProgress && 'border-border'
      )}
    >
      {/* Pill — „TU JESTEŚ" gdy aktywna (in_progress zadania), „W TOKU" gdy rozpoczęta */}
      {isInProgress && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-2.5 left-2 text-white',
            'rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.04em]',
            'font-heading leading-none',
            isActive ? 'bg-teal' : 'bg-status-at'
          )}
        >
          {isActive ? 'TU JESTEŚ' : 'W TOKU'}
        </span>
      )}

      {/* Numer fazy — F{n} */}
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
          isDone ? 'text-muted-foreground'
            : isActive ? 'text-teal-strong'
            : isInProgress ? 'text-status-at'
            : 'text-foreground'
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
  onRequestNewCr?: () => void
}

function DecisionDiamond({ decision, onSelectStep, onRequestNewCr }: DecisionDiamondProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const label = DECISION_LABELS[decision.type]
  const statusLabel = DECISION_STATUS_LABELS[decision.status]
  const ariaLabel = `${decision.title} — ${statusLabel}`

  const isYes = decision.status === 'yes'
  const isNo = decision.status === 'no'

  function handleClick() {
    // Zawsze otwiera dialog
    if (decision.stepId) {
      onSelectStep(decision.stepId)
    }
    setDialogOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={ariaLabel}
        aria-label={ariaLabel}
        className={cn(
          'group flex flex-col items-center justify-center gap-1.5',
          'min-w-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/60 rounded',
          'transition-opacity duration-200 hover:opacity-80',
          // Wyszarzenie gdy pomijamy
          isNo && 'opacity-50'
        )}
      >
        {/* Romb — wygląd wg statusu */}
        <span
          aria-hidden="true"
          className={cn(
            'block size-7 rotate-45 rounded-[4px] border-2 transition-colors',
            // pending — obrysowany fioletem SPO
            !isYes && !isNo && 'border-spo bg-transparent',
            // yes — wypełniony tealem
            isYes && 'border-teal bg-teal',
            // no — czerwony border
            isNo && 'border-status-off bg-transparent'
          )}
        />
        {/* Etykieta pod rombem */}
        <span
          className={cn(
            'font-heading font-semibold text-[9px] leading-none whitespace-nowrap',
            !isYes && !isNo && 'text-spo',
            isYes && 'text-teal',
            isNo && 'text-status-off'
          )}
        >
          {isYes ? '◆' : isNo ? '✕' : '◇'} {label}
        </span>
      </button>

      <DecisionDialog
        decision={{
          id: decision.id,
          title: decision.title,
          type: decision.type,
          status: decision.status,
          decidedByName: decision.decidedByName,
          decidedAt: decision.decidedAt,
          notes: decision.notes,
        }}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRequestNewCr={onRequestNewCr}
      />
    </>
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
export function PhaseStrip({ steps, decisions, onSelectStep, onRequestNewCr, specialists, pmProfiles }: PhaseStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [])

  // Auto-scroll to first active step on mount
  useEffect(() => {
    const activeStep = steps.find(s => s.isActive)
    if (activeStep && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-step-id="${activeStep.id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [steps])

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
    <div className="relative">
      {/* Gradient fade prawa krawędź — wskazuje że można scrollować */}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-card to-transparent"
        />
      )}
    <div
      ref={scrollRef}
      // pt-4 żeby pill „TU JESTEŚ" nie był przycinany przez overflow-x-auto
      // [&::-webkit-scrollbar] — cienki scrollbar na WebKit zamiast grubego domyślnego
      className="flex items-stretch overflow-x-auto pb-3 pt-4 gap-0 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:transparent"
      role="navigation"
      aria-label="Ścieżka faz projektu"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        const showArrow = !isLast

        return (
          <div
            key={item.kind === 'step' ? item.step.id : item.decision.id}
            className="flex items-stretch"
            {...(item.kind === 'step' ? { 'data-step-id': item.step.id } : {})}
          >
            {item.kind === 'step' ? (
              <PhaseBlock
                step={item.step}
                onClick={() => setExpandedStepId(id => id === item.step.id ? null : item.step.id)}
              />
            ) : (
              <DecisionDiamond
                decision={item.decision}
                onSelectStep={onSelectStep}
                onRequestNewCr={onRequestNewCr}
              />
            )}
            {showArrow && <Arrow />}
          </div>
        )
      })}
    </div>

    {/* Panel rozwinięcia — zadania wybranej fazy */}
    {expandedStepId && (() => {
      const step = steps.find(s => s.id === expandedStepId)
      if (!step) return null
      const visibleTasks = step.tasks.filter(t => !t.hidden)
      const done = visibleTasks.filter(t => t.status === 'done').length
      return (
        <div className="mt-2 rounded-xl border border-teal/20 bg-card shadow-whisper overflow-hidden">
          {/* Nagłówek panelu */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm text-foreground">{step.phaseName}</span>
              <span className="font-meta text-xs text-muted-foreground">
                {done}/{visibleTasks.length} ukończone
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectStep(expandedStepId)}
                className="flex items-center gap-1 font-meta text-xs text-teal hover:text-teal-strong transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Checklist
              </button>
              <button
                type="button"
                onClick={() => setExpandedStepId(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Zamknij panel"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Lista zadań */}
          {visibleTasks.length === 0 ? (
            <p className="px-4 py-6 text-center font-meta text-xs text-muted-foreground">
              Brak widocznych zadań w tej fazie.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {visibleTasks.map(task => (
                <div key={task.id} className={cn(
                  'flex items-center gap-2 px-3 py-2',
                  task.status === 'done' && 'opacity-60',
                  task.status === 'na' && 'opacity-40'
                )}>
                  {/* Status */}
                  <div className="shrink-0">
                    <TaskStatusControl taskId={task.id} status={task.status} />
                  </div>
                  {/* Tytuł */}
                  <span className={cn(
                    'flex-1 font-heading text-xs leading-snug min-w-0 truncate',
                    task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}>
                    {task.title}
                  </span>
                  {/* Estymacja */}
                  <div className="shrink-0">
                    <TaskEstControl taskId={task.id} est={task.est} />
                  </div>
                  {/* Wykonawca (konsultant) */}
                  <div className="shrink-0">
                    <TaskAssigneeControl taskId={task.id} assigneeName={task.assigneeName} specialists={specialists ?? []} />
                  </div>
                  {/* PM */}
                  <div className="shrink-0">
                    <TaskPmControl taskId={task.id} pmAssigneeId={task.pmAssigneeId} profiles={pmProfiles ?? []} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    })()}
    </div>
  )
}
