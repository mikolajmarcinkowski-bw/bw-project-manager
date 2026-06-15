import { cn } from '@/lib/utils'
import type { ImplType } from '@/lib/data/projects'

const IMPL_TYPE_LABELS: Record<ImplType, string> = {
  CRM: 'CRM',
  SPO: 'SPO',
  INT: 'INT',
  MKT: 'MKT',
  ERP: 'ERP',
}

interface ImplTypeBadgeProps {
  type: ImplType
  className?: string
}

export function ImplTypeBadge({ type, className }: ImplTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border px-1.5 py-0.5 font-mono text-[0.65rem] font-medium text-muted-foreground',
        className
      )}
    >
      {IMPL_TYPE_LABELS[type]}
    </span>
  )
}
