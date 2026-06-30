'use client'

import Link from 'next/link'
import { UserCheck, ExternalLink } from 'lucide-react'
import type { ConsultantDetail } from '@/lib/data/team'

// ─── Statusy zadań ────────────────────────────────────────────────────────────

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Planowane',
  in_progress: 'W toku',
  done: 'Ukończone',
  for_quality: 'QA',
  na: 'N/D',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground border border-border',
  in_progress: 'bg-teal/10 text-teal border border-teal/30',
  done: 'bg-green-500/10 text-green-600 border border-green-500/30 dark:text-green-400',
  for_quality: 'bg-orange/10 text-orange border border-orange/30',
  na: 'bg-muted text-muted-foreground/50 border border-border',
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktywny',
  completed: 'Zakończony',
  archived: 'Zarchiwizowany',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-teal/10 text-teal border border-teal/30',
  completed: 'bg-green-500/10 text-green-600 border border-green-500/30 dark:text-green-400',
  archived: 'bg-muted text-muted-foreground border border-border',
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function dueDateClass(dueDate: string | null, status: string): string {
  if (!dueDate || status === 'done' || status === 'na') return 'text-muted-foreground'
  const today = new Date().toISOString().slice(0, 10)
  if (dueDate < today) return 'text-status-off font-medium'
  // Zbliża się = w ciągu 7 dni
  const diff = new Date(dueDate).getTime() - new Date(today).getTime()
  if (diff <= 7 * 24 * 60 * 60 * 1000) return 'text-yellow-600 dark:text-yellow-400 font-medium'
  return 'text-muted-foreground'
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

// ─── Komponent główny ─────────────────────────────────────────────────────────

interface ConsultantViewProps {
  consultant: ConsultantDetail
}

export function ConsultantView({ consultant }: ConsultantViewProps) {
  const { fullName, role, isActive, taskCount, projectCount, projects } = consultant

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      {/* Header — avatar + dane + badge statusu */}
      <div className="flex items-start gap-4">
        {/* Avatar z inicjałami */}
        <div
          className="h-12 w-12 shrink-0 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="font-semibold text-sm text-teal select-none">
            {getInitials(fullName)}
          </span>
        </div>

        {/* Dane konsultanta */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {fullName}
            </h1>
            {isActive ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium bg-teal/10 text-teal border border-teal/30">
                Aktywny
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium bg-muted text-status-off border border-border">
                Nieaktywny
              </span>
            )}
          </div>
          {role && (
            <p className="font-meta text-sm text-muted-foreground">{role}</p>
          )}
        </div>
      </div>

      {/* Statystyki chipsy */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-whisper">
          <span className="font-semibold text-sm text-foreground tabular-nums">{taskCount}</span>
          <span className="font-meta text-xs text-muted-foreground">
            {taskCount === 1 ? 'zadanie aktywne' : taskCount >= 2 && taskCount <= 4 ? 'zadania aktywne' : 'zadań aktywnych'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-whisper">
          <span className="font-semibold text-sm text-foreground tabular-nums">{projectCount}</span>
          <span className="font-meta text-xs text-muted-foreground">
            {projectCount === 1 ? 'projekt' : projectCount >= 2 && projectCount <= 4 ? 'projekty' : 'projektów'}
          </span>
        </div>
      </div>

      {/* Treść: projekty z zadaniami lub empty state */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center flex flex-col items-center gap-3">
          <UserCheck className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-meta text-sm font-medium text-muted-foreground">
              Brak aktywnych zadań
            </p>
            <p className="font-meta text-xs text-muted-foreground/70">
              Konsultant nie ma przypisanych zadań w aktywnych projektach.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card shadow-whisper overflow-hidden"
            >
              {/* Nagłówek projektu */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {project.name}
                      </span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium shrink-0',
                          PROJECT_STATUS_COLORS[project.status] ?? 'bg-muted text-muted-foreground border border-border',
                        ].join(' ')}
                      >
                        {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                      </span>
                    </div>
                    <p className="font-meta text-xs text-muted-foreground mt-0.5">
                      {project.clientName}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/projects/${project.id}`}
                  className="shrink-0 flex items-center gap-1 font-meta text-xs text-muted-foreground hover:text-teal transition-colors active:scale-[0.97] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
                  aria-label={`Przejdź do projektu ${project.name}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Projekt
                </Link>
              </div>

              {/* Lista zadań */}
              {project.tasks.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="font-meta text-xs text-muted-foreground/60">
                    Brak zadań w tym projekcie.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border" role="list">
                  {project.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      {/* Status pill */}
                      <span
                        className={[
                          'mt-0.5 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium',
                          TASK_STATUS_COLORS[task.status] ?? 'bg-muted text-muted-foreground border border-border',
                        ].join(' ')}
                      >
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </span>

                      {/* Tytuł + faza + termin */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {task.phaseName && (
                            <span className="font-meta text-xs text-muted-foreground/70">
                              Faza {task.phaseNumber} — {task.phaseName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span
                              className={[
                                'font-meta text-xs',
                                dueDateClass(task.dueDate, task.status),
                              ].join(' ')}
                              title={`Termin: ${formatDate(task.dueDate)}`}
                            >
                              do {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
