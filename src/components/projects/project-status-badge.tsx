import { cn } from '@/lib/utils'

type ProjectStatus = 'active' | 'completed' | 'archived'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Aktywny',
  completed: 'Zakończony',
  archived: 'Archiwum',
}

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: 'bg-teal/10 text-teal border-teal/20',
  completed: 'bg-muted text-muted-foreground border-border',
  archived: 'bg-muted text-muted-foreground/70 border-border/60',
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-meta text-[0.7rem] font-medium',
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
