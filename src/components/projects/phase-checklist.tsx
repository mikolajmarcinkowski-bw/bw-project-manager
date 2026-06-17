'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { GanttStep, GanttTask, TaskKind } from '@/lib/data/projects'
import { TaskStatusControl } from './task-status-control'
import { TaskAssigneeControl } from './task-assignee-control'
import type { Profile } from './task-assignee-control'
import { TaskDateControl } from './task-date-control'

// ─── Kolory KIND (zsync z gantt-chart.tsx) ────────────────────────────────────
// SYNC: gdy zmieniasz KIND_COLOR w gantt-chart.tsx, zmień też tutaj.
const KIND_COLOR: Record<TaskKind, string> = {
  ws:     '#185FA5',  // warsztat — niebieski
  own:    '#E06C1A',  // własna — ciepły pomarańcz
  config: '#28B39B',  // config — teal
  test:   '#EF9F27',  // testy — amber
  pm:     '#9DA8A5',  // PM — szary
  ms:     '#7C3AED',  // milestone — fiolet SPO
}

const KIND_LABEL: Record<TaskKind, string> = {
  ws:     'warsztat',
  own:    'własna',
  config: 'config',
  test:   'testy',
  pm:     'PM',
  ms:     'milestone',
}

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

/** Czy zadanie jest po terminie (due_date < dziś i nie done/na). Zsync z gantt-chart. */
function isOverdue(task: GanttTask): boolean {
  const todayISO = new Date().toISOString().slice(0, 10)
  return (
    task.dueDate !== null &&
    task.dueDate < todayISO &&
    task.status !== 'done' &&
    task.status !== 'na'
  )
}

/** Liczba dni do terminu (lokalna strefa). Zsync z gantt-chart. */
function daysUntilDue(dueDateISO: string): number {
  const d = new Date(dueDateISO + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - now.getTime()) / 86400000)
}

function getAlertLevel(task: GanttTask): 'overdue' | 'soon' | undefined {
  if (!task.dueDate) return undefined
  if (isOverdue(task)) return 'overdue'
  const days = daysUntilDue(task.dueDate)
  // „soon" = termin za 0–2 dni (zsync z gantt-chart L854–858)
  if (days >= 0 && days <= 2) return 'soon'
  return undefined
}

// ─── Chip rodzaju zadania ─────────────────────────────────────────────────────

function KindChip({ kind }: { kind: TaskKind }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.55rem] font-heading font-semibold text-white leading-none shrink-0"
      style={{ backgroundColor: KIND_COLOR[kind] }}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

// ─── Romb milestone ───────────────────────────────────────────────────────────

function MilestoneDiamond() {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 inline-block size-2.5 rotate-45 rounded-[2px] bg-spo"
      title="Milestone"
    />
  )
}

// ─── Wiersz zadania ───────────────────────────────────────────────────────────

interface TaskRowProps {
  task: GanttTask
  profiles: Profile[]
}

function TaskRow({ task, profiles }: TaskRowProps) {
  const alertLevel = getAlertLevel(task)
  const isDone = task.status === 'done'
  const isNA = task.status === 'na'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 min-h-[52px]',
        'border-b border-border/50 last:border-b-0',
        'transition-colors',
        isDone && 'bg-muted/20',
        isNA && 'opacity-60'
      )}
    >
      {/* Status — klikalny dropdown */}
      <div className="shrink-0">
        <TaskStatusControl taskId={task.id} status={task.status} />
      </div>

      {/* Romb dla milestona */}
      {task.isMilestone && (
        <MilestoneDiamond />
      )}

      {/* Tytuł zadania */}
      <span
        className={cn(
          'flex-1 font-heading text-sm leading-snug min-w-0',
          isDone ? 'line-through text-muted-foreground' : 'text-foreground',
          task.isMilestone && 'font-semibold text-spo'
        )}
      >
        {task.title}
      </span>

      {/* Chip rodzaju — nie dla milestona (wyróżniony rombem) */}
      {!task.isMilestone && (
        <KindChip kind={task.kind} />
      )}

      {/* Owner — avatar inicjałów klikalny */}
      <div className="shrink-0">
        <TaskAssigneeControl
          taskId={task.id}
          assigneeName={task.assigneeName}
          profiles={profiles}
        />
      </div>

      {/* Termin — klikalny, kolor wg alertLevel */}
      <div className="shrink-0">
        <TaskDateControl
          taskId={task.id}
          dueDate={task.dueDate}
          alertLevel={alertLevel}
        />
      </div>
    </div>
  )
}

// ─── PhaseChecklist ───────────────────────────────────────────────────────────

export interface PhaseChecklistProps {
  step: GanttStep
  profiles: Profile[]
}

export function PhaseChecklist({ step, profiles }: PhaseChecklistProps) {
  const [showHidden, setShowHidden] = useState(false)

  // Kolejność tablicy zachowuje task_order (warstwa danych sortuje po task_order przy fetch)
  const visibleTasks = step.tasks.filter((t) => !t.hidden)
  const hiddenTasks = step.tasks.filter((t) => t.hidden)

  // Licznik ukończonych: widoczne + nie-N/A + nie-milestone (spójna z gantt-chart nagłówek zwiniętej fazy ~L630)
  const countableTasks = visibleTasks.filter((t) => !t.isMilestone && t.status !== 'na')
  const doneCount = countableTasks.filter((t) => t.status === 'done').length
  const totalCount = countableTasks.length

  return (
    <div
      className="flex flex-col gap-0"
      role="region"
      aria-label={`Checklist fazy ${step.phaseNumber}: ${step.phaseName}`}
    >
      {/* ── Nagłówek breadcrumb ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[0.6rem] text-muted-foreground uppercase tracking-widest">
            FAZA {step.phaseNumber}
          </span>
          <span className="font-mono text-[0.6rem] text-muted-foreground/40" aria-hidden="true">
            —
          </span>
          <span className="font-heading font-semibold text-sm text-foreground">
            {step.phaseName}
          </span>
          {step.isActive && (
            <span className="inline-flex items-center rounded-full bg-teal/10 text-teal border border-teal/30 px-2 py-0.5 text-[0.6rem] font-heading font-semibold uppercase tracking-[0.04em] leading-none">
              TU JESTEŚ
            </span>
          )}
        </div>

        {/* Licznik ukończonych + pasek postępu */}
        <div className="flex items-center gap-2.5">
          <span className="font-meta text-xs text-muted-foreground">
            <span
              className={cn(
                'font-semibold',
                doneCount === totalCount && totalCount > 0
                  ? 'text-teal-strong'
                  : 'text-foreground'
              )}
            >
              {doneCount}
            </span>
            <span className="text-muted-foreground/60"> / {totalCount}</span>
            <span className="ml-1">zadań ukończonych</span>
          </span>

          {totalCount > 0 && (
            <div
              className="flex-1 max-w-[100px] h-1 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-label={`Postęp fazy: ${doneCount} z ${totalCount}`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  doneCount === totalCount ? 'bg-teal-strong' : 'bg-teal'
                )}
                style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Karta z listą zadań ──────────────────────────────────────────── */}
      <div className="rounded-[9px] border border-border bg-card shadow-whisper overflow-hidden">

        {/* Stan pusty */}
        {visibleTasks.length === 0 && hiddenTasks.length === 0 && (
          <div className="flex items-center justify-center py-10 px-4">
            <p className="font-meta text-xs text-muted-foreground text-center">
              Brak zadań w tej fazie.
            </p>
          </div>
        )}

        {/* Zadania widoczne */}
        {visibleTasks.map((task) => (
          <TaskRow key={task.id} task={task} profiles={profiles} />
        ))}

        {/* Toggle ukrytych zadań N/A */}
        {hiddenTasks.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowHidden((v) => !v)}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-4 py-2.5',
                'text-[0.65rem] font-meta font-medium text-muted-foreground',
                'border-t border-dashed border-border/60',
                'hover:bg-muted/30 hover:text-muted-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset'
              )}
              aria-expanded={showHidden}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block transition-transform duration-150 text-[0.5rem]',
                  showHidden ? 'rotate-90' : 'rotate-0'
                )}
              >
                ▶
              </span>
              {showHidden
                ? `Ukryj ${hiddenTasks.length} zadań N/A`
                : `Pokaż ${hiddenTasks.length} ukrytych zadań N/A`}
            </button>

            {showHidden &&
              hiddenTasks.map((task) => (
                <TaskRow key={task.id} task={task} profiles={profiles} />
              ))}
          </>
        )}
      </div>

      {/* ── Nota R2 ──────────────────────────────────────────────────────── */}
      <p className="pt-3 font-meta text-[0.65rem] text-muted-foreground/70 leading-relaxed">
        Ukończenie fazy nie wymaga zamknięcia wszystkich zadań (R2). Zadania oznaczone jako N/D
        są wykluczone z licznika postępu.
      </p>
    </div>
  )
}
