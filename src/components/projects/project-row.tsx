import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImplTypeBadge } from './impl-type-badge'
import { ProjectStatusBadge } from './project-status-badge'
import type { ImplType } from '@/lib/data/projects'

export interface ProjectRowData {
  id: string
  name: string
  clientId?: string
  clientName?: string
  status: 'active' | 'completed' | 'archived'
  types: ImplType[]
  startDate: string | null
  endDate?: string | null
  atRisk: boolean
}

interface ProjectRowProps {
  project: ProjectRowData
  showClient?: boolean
  linkDisabled?: boolean
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'b.d.'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ProjectRow({ project, showClient = false, linkDisabled = false }: ProjectRowProps) {
  const inner = (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2.5',
        'transition-colors duration-200 ease-out',
        !linkDisabled && [
          'cursor-pointer',
          'hover:bg-muted/70',
          // Press state: only on genuinely clickable rows
          'active:bg-muted/90',
        ],
        project.atRisk && 'bg-status-off/5 hover:bg-status-off/10'
      )}
    >
      {/* Nazwa + klient */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-medium text-foreground truncate',
            'transition-colors duration-200',
            !linkDisabled && 'group-hover:text-teal-strong'
          )}>
            {project.name}
          </span>
          {project.atRisk && (
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-status-off"
              aria-label="Projekt zagrożony"
            />
          )}
        </div>
        {showClient && project.clientName && (
          <span className="font-meta text-xs text-muted-foreground truncate">
            {project.clientName}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0">
        <ProjectStatusBadge status={project.status} />
      </div>

      {/* Typy */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {project.types.map((t) => (
          <ImplTypeBadge key={t} type={t} />
        ))}
      </div>

      {/* Daty */}
      <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[110px]">
        {project.startDate && (
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            {formatDate(project.startDate)}
          </span>
        )}
        {project.endDate && (
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            &rarr; {formatDate(project.endDate)}
          </span>
        )}
      </div>
    </div>
  )

  if (linkDisabled) {
    return (
      <div
        aria-label={`Projekt: ${project.name}${project.atRisk ? ', zagrożony' : ''}`}
        title="Widok projektu niedostępny w tej wersji"
      >
        {inner}
      </div>
    )
  }

  return (
    <a
      href={`/projects/${project.id}`}
      aria-label={`Projekt: ${project.name}${project.atRisk ? ', zagrożony' : ''}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1 rounded-md"
    >
      {inner}
    </a>
  )
}
