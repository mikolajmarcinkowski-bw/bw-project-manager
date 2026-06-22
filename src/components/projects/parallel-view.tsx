'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import type { GanttStep, ProjectDetail } from '@/lib/data/projects'

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Decision = ProjectDetail['decisions'][number]

export interface ParallelViewProps {
  steps: GanttStep[]
  decisions?: Decision[]
  onSelectStep?: (stepId: string) => void
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

function countTasks(step: GanttStep) {
  let total = 0
  let done = 0
  let inProgress = 0
  let estSum = 0

  for (const task of step.tasks) {
    if (task.isMilestone) continue
    if (task.status === 'na') continue
    total++
    if (task.status === 'done') done++
    if (task.status === 'in_progress') inProgress++
    if (task.est !== null) estSum += task.est
  }

  return { total, done, inProgress, estSum }
}

const STEP_STATUS_PILL: Record<GanttStep['status'], string> = {
  todo: 'bg-muted text-muted-foreground border border-border',
  in_progress: 'bg-teal/15 text-teal-strong border border-teal/25',
  done: 'bg-teal/20 text-teal-strong border border-teal/30',
  skipped: 'bg-muted/50 text-muted-foreground/60 border border-border/50',
}

const STEP_STATUS_LABEL: Record<GanttStep['status'], string> = {
  todo: 'do zrobienia',
  in_progress: 'w toku',
  done: 'gotowe',
  skipped: 'pominięty',
}

const TASK_STATUS_DOT: Record<string, string> = {
  todo: 'bg-muted-foreground/40',
  in_progress: 'bg-teal',
  done: 'bg-teal-strong',
  for_quality: 'bg-status-quality',
  na: 'bg-muted-foreground/20',
}

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: 'Plan.',
  in_progress: 'W toku',
  done: 'Gotowe',
  for_quality: 'QA',
  na: 'N/D',
}

function ParallelMark() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-[2px] align-middle mr-0.5">
      <span className="block w-[2px] h-3 rounded-full bg-current" />
      <span className="block w-[2px] h-3 rounded-full bg-current" />
    </span>
  )
}

// ─── Kolumna fazy ─────────────────────────────────────────────────────────────

interface ParallelColumnProps {
  step: GanttStep
  stepDecisions: Decision[]
  onSelectStep?: (stepId: string) => void
  totalColumns: number
}

function ParallelColumn({ step, stepDecisions, onSelectStep, totalColumns }: ParallelColumnProps) {
  const [expanded, setExpanded] = useState(false)
  const { total, done, inProgress, estSum } = countTasks(step)
  const isActive = step.isActive
  const visibleTasks = step.tasks.filter((t) => !t.hidden && t.status !== 'na')

  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border overflow-hidden transition-shadow',
        isActive
          ? 'border-2 border-teal ring-1 ring-teal/20'
          : 'border-border/60',
      )}
    >
      {/* Nagłówek — klikalny */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-all duration-200',
          'active:scale-[0.97]',
          isActive
            ? 'bg-teal/10 hover:bg-teal/15'
            : 'bg-muted/40 hover:bg-muted/60',
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {isActive ? (
            <span aria-hidden="true" className="text-[10px] text-teal shrink-0">▶</span>
          ) : (
            <ParallelMark />
          )}
          {step.isRecurring && (
            <RefreshCw className="h-2.5 w-2.5 text-teal/60 shrink-0" aria-label="Cykliczny" />
          )}
          <span className="font-heading font-semibold text-[12.5px] text-teal-strong truncate">
            F{step.phaseNumber} — {step.phaseName}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold whitespace-nowrap',
            STEP_STATUS_PILL[step.status]
          )}>
            {STEP_STATUS_LABEL[step.status]}
          </span>
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-teal/60" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          }
        </span>
      </button>

      {/* Podsumowanie (zawsze widoczne) */}
      <div className="px-3 py-2 border-t border-border/40 bg-card">
        {total > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="w-full bg-muted rounded-full overflow-hidden" style={{ height: 3 }}>
              <div
                className="h-full rounded-full bg-teal transition-all duration-500"
                style={{ width: `${progressPct}%` }}
                aria-hidden="true"
              />
            </div>
            <p className="font-meta text-[0.65rem] text-muted-foreground">
              <span className="text-foreground/70">{done}/{total}</span> gotowe
              {inProgress > 0 && <> · <span className="text-teal">{inProgress} w toku</span></>}
              {estSum > 0 && <> · <span className="font-mono">Σ {estSum}h</span></>}
            </p>
          </div>
        ) : (
          <p className="font-meta text-[0.65rem] text-muted-foreground/60 italic">Brak zadań w tej fazie.</p>
        )}
      </div>

      {/* Rozwinięte zadania */}
      {expanded && visibleTasks.length > 0 && (
        <div className="border-t border-border/40 divide-y divide-border/30 bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200">
          {visibleTasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 py-2 min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-both"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Status dot */}
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0 rounded-full',
                  TASK_STATUS_DOT[task.status] ?? 'bg-muted-foreground/40'
                )}
                style={{ width: 6, height: 6 }}
              />
              {/* Tytuł */}
              <span className={cn(
                'flex-1 font-heading text-xs leading-snug truncate',
                task.status === 'done'
                  ? 'line-through text-muted-foreground/60'
                  : 'text-foreground'
              )}>
                {task.title}
              </span>
              {/* Status pill */}
              <span className="font-meta text-[0.6rem] text-muted-foreground shrink-0 whitespace-nowrap">
                {TASK_STATUS_LABEL[task.status] ?? task.status}
              </span>
              {/* Assignee */}
              {task.assigneeName && (
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-grid place-items-center rounded-full bg-teal/10 text-teal font-heading font-bold text-[0.45rem]"
                  style={{ width: 16, height: 16 }}
                  title={task.assigneeName}
                >
                  {task.assigneeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
              {/* Est */}
              {task.est != null && (
                <span className="font-mono text-[0.6rem] text-muted-foreground/60 shrink-0">
                  {task.est}h
                </span>
              )}
            </div>
          ))}

          {/* Link do Checklist */}
          {onSelectStep && (
            <button
              type="button"
              onClick={() => onSelectStep(step.id)}
              className="w-full px-3 py-2 font-meta text-[0.65rem] text-teal hover:text-teal-strong hover:bg-teal/5 text-left transition-colors"
            >
              Otwórz Checklist fazy →
            </button>
          )}
        </div>
      )}

      {/* Gdy expanded ale brak zadań */}
      {expanded && visibleTasks.length === 0 && (
        <div className="border-t border-border/40 px-3 py-3 bg-card motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <p className="font-meta text-[0.65rem] text-muted-foreground/60 italic text-center">
            Brak widocznych zadań.
          </p>
          {onSelectStep && (
            <button
              type="button"
              onClick={() => onSelectStep(step.id)}
              className="mt-1.5 w-full font-meta text-[0.65rem] text-teal hover:text-teal-strong text-left transition-colors"
            >
              Otwórz Checklist fazy →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ParallelView ─────────────────────────────────────────────────────────────

export function ParallelView({ steps, decisions = [], onSelectStep }: ParallelViewProps) {
  // Wszystkie aktywne fazy (isActive) + równoległe (isParallel && in_progress)
  const activeSteps = steps.filter((s) => s.isActive)
  const parallelSteps = steps.filter((s) => s.isParallel && !s.isActive && s.status === 'in_progress')

  const combined = [...activeSteps, ...parallelSteps]

  if (combined.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 px-4 py-3 text-xs text-muted-foreground/60 italic text-center">
        Brak aktywnej fazy.
      </div>
    )
  }

  // Grid: 1 kolumna na mobile, 2 gdy >=2 fazy, 3 gdy >=3 fazy (max 3 per rząd)
  const cols = combined.length === 1
    ? 'grid-cols-1'
    : combined.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

  return (
    <div
      className={cn('grid gap-3 items-start', cols)}
      aria-label="Aktywne fazy projektu"
    >
      {combined.map((step) => (
        <ParallelColumn
          key={step.id}
          step={step}
          stepDecisions={decisions}
          onSelectStep={onSelectStep}
          totalColumns={combined.length}
        />
      ))}
    </div>
  )
}
