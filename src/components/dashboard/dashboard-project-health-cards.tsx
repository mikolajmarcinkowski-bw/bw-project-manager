// Server Component — brak 'use client'. Link działa bez 'use client'.
// Wyświetla karty health dla każdego aktywnego projektu (D-R1 v2).

import Link from 'next/link'
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Flame, GitPullRequest } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectHealthCard } from '@/lib/data/projects'

interface DashboardProjectHealthCardsProps {
  projects: ProjectHealthCard[]
}

function ProjectCard({ project }: { project: ProjectHealthCard }) {
  const hasIssues =
    project.risksRed > 0 ||
    project.crPending > 0 ||
    (project.burnRate !== null && project.burnRate >= 80)

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group flex flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-whisper',
        'transition-all duration-200 hover:shadow-whisper-md hover:-translate-y-px',
        hasIssues ? 'hover:border-status-off/40' : 'hover:border-teal/40'
      )}
    >
      {/* Klient + nazwa projektu */}
      <div>
        <p className="font-meta text-[0.65rem] text-muted-foreground leading-none mb-0.5">
          {project.clientName}
        </p>
        <p className="font-heading font-semibold text-sm text-foreground line-clamp-1 leading-snug">
          {project.name}
        </p>
      </div>

      {/* Bieżąca faza */}
      {project.currentPhase && (
        <p className="font-meta text-[0.68rem] text-teal line-clamp-1">{project.currentPhase}</p>
      )}

      {/* Odznaki health */}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
        {project.risksRed > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-meta text-[0.65rem] bg-status-off/10 text-status-off border border-status-off/30">
            <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
            {project.risksRed} {project.risksRed === 1 ? 'ryzyko R' : 'ryzyk R'}
          </span>
        )}
        {project.crPending > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-meta text-[0.65rem] bg-status-at/10 text-status-at border border-status-at/30">
            <GitPullRequest className="h-2.5 w-2.5" aria-hidden="true" />
            {project.crPending} CR
          </span>
        )}
        {project.burnRate !== null && project.burnRate >= 80 && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-meta text-[0.65rem] border',
              project.burnRate >= 100
                ? 'bg-status-off/10 text-status-off border-status-off/30'
                : 'bg-status-at/10 text-status-at border-status-at/30'
            )}
          >
            <Flame className="h-2.5 w-2.5" aria-hidden="true" />
            Burn {project.burnRate}%
          </span>
        )}
        {!hasIssues && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-meta text-[0.65rem] bg-teal/10 text-teal border border-teal/30">
            <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
            OK
          </span>
        )}
      </div>

      {/* Strzałka nawigacyjna */}
      <ArrowRight
        className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground ml-auto -mt-1 transition-colors"
        aria-hidden="true"
      />
    </Link>
  )
}

export function DashboardProjectHealthCards({ projects }: DashboardProjectHealthCardsProps) {
  return (
    <section aria-labelledby="section-project-health">
      <h2
        id="section-project-health"
        className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2"
      >
        <Activity className="h-4 w-4 text-teal" aria-hidden="true" />
        Stan projektów ({projects.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  )
}
