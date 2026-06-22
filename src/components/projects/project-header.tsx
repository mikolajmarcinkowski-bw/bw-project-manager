import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { ProjectStatusBadge } from './project-status-badge'
import { ImplTypeBadge } from './impl-type-badge'
import { EditProjectDialog } from './edit-project-dialog'
import { ProjectLifecycleActions } from './project-lifecycle-actions'
import type { ProjectDetail, ProjectHealthMetrics } from '@/lib/data/projects'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'b.d.'
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return 'b.d.'
  }
}

// ProjectStatusBadge accepts only 'active'|'completed'|'archived'.
// ProjectDetail.status is `string` — narrow here, render neutral fallback otherwise.
const KNOWN_STATUSES = ['active', 'completed', 'archived'] as const
type KnownStatus = (typeof KNOWN_STATUSES)[number]

function isKnownStatus(s: string): s is KnownStatus {
  return (KNOWN_STATUSES as readonly string[]).includes(s)
}

interface ProjectHeaderProps {
  project: ProjectDetail
  profiles: { id: string; full_name: string | null }[]
  health?: ProjectHealthMetrics
}

export function ProjectHeader({ project, profiles, health }: ProjectHeaderProps) {
  const { client, name, description, status, variant, types, pms, startDate, endDate, atRisk } = project

  return (
    <header className="mb-6">
      {/* Breadcrumb */}
      <nav aria-label="Ścieżka nawigacyjna" className="mb-2 flex items-center gap-1.5 font-meta text-xs text-muted-foreground">
        <Link
          href="/dashboard"
          className="text-teal-strong hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        >
          Teczki klientów
        </Link>
        <span aria-hidden="true" className="text-muted-foreground mx-0.5">/</span>
        <Link
          href={`/clients/${client.id}`}
          className="hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        >
          {client.name}
        </Link>
        <span aria-hidden="true" className="text-muted-foreground mx-0.5">/</span>
        <span className="text-foreground font-medium truncate max-w-[40ch]" aria-current="page">{name}</span>
      </nav>

      {/* Nagłówek */}
      <div className="flex items-start gap-3">
        <h1 className="flex-1 min-w-0 text-xl font-semibold leading-tight tracking-tight truncate">
          {name}
        </h1>
        {variant === 'dev' && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.65rem] font-semibold bg-spo/10 text-spo border border-spo/30 shrink-0 self-center">
            DEV
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <EditProjectDialog
            project={{
              id: project.id,
              name,
              description,
              startDate,
              endDate,
              clientId: client.id,
              types,
              pms,
            }}
            profiles={profiles}
          />
          <ProjectLifecycleActions
            project={{ id: project.id, name, status }}
          />
          {atRisk && (
            <span className="flex items-center gap-1 rounded-full bg-status-off/10 border border-status-off/20 px-2.5 py-1 text-[0.7rem] font-semibold text-status-off whitespace-nowrap select-none">
              <AlertTriangle
                size={12}
                aria-hidden="true"
                className="shrink-0"
              />
              Zagrożony
            </span>
          )}
        </div>
      </div>

      {/* Rząd metadanych */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {/* Status projektu */}
        <div className="flex items-center gap-1.5">
          {isKnownStatus(status) ? (
            <ProjectStatusBadge status={status} />
          ) : (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-meta text-[0.7rem] font-medium text-muted-foreground">
              {status}
            </span>
          )}
        </div>

        {/* Typy wdrożenia */}
        {types.length > 0 && (
          <div className="flex items-center gap-1" aria-label="Typy wdrożenia">
            {types.map((type) => (
              <ImplTypeBadge key={type} type={type} />
            ))}
          </div>
        )}

        {/* PM-owie */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70 text-xs uppercase tracking-wide font-medium">PM:</span>
          {pms.length === 0 ? (
            <span className="text-muted-foreground/60 italic text-xs">— Bez PM —</span>
          ) : (
            <span>
              {pms.map((pm) => pm.fullName ?? '—').join(', ')}
            </span>
          )}
        </div>

        {/* Zakres dat */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70 text-xs uppercase tracking-wide font-medium">Zakres:</span>
          <span>
            {formatDate(startDate)}
            <span className="mx-1 text-border">–</span>
            {formatDate(endDate)}
          </span>
        </div>

        {/* Health badges */}
        {health && (health.risksRed > 0 || health.crPending > 0 || (health.burnRate !== null && health.burnRate > 75)) && (
          <div className="flex items-center gap-1.5 flex-wrap" aria-label="Status dokumentów projektu">
            {health.risksRed > 0 && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6rem] font-heading font-semibold bg-status-off/10 border border-status-off/30 text-status-off"
                title={`${health.risksRed} aktywnych ryzyk R`}
              >
                ▲ {health.risksRed}R
              </span>
            )}
            {health.crPending > 0 && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6rem] font-heading font-semibold bg-status-at/10 border border-status-at/30 text-status-at"
                title={`${health.crPending} CR oczekujących na zatwierdzenie`}
              >
                CR: {health.crPending}
              </span>
            )}
            {health.burnRate !== null && health.burnRate > 75 && (
              <span
                className={[
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.6rem] font-heading font-semibold border',
                  health.burnRate > 90
                    ? 'bg-status-off/10 border-status-off/30 text-status-off'
                    : health.burnRate > 80
                      ? 'bg-status-at/10 border-status-at/30 text-status-at'
                      : 'bg-muted border-border text-muted-foreground',
                ].join(' ')}
                title={`Burn rate: ${health.burnRate}%`}
              >
                Burn: {health.burnRate}%
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
