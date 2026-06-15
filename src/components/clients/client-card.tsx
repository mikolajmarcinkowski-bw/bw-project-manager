import Link from 'next/link'
import { AlertTriangle, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ClientCardProps {
  id: string
  name: string
  projectCount: number
  activeCount: number
  atRisk: boolean
}

export function ClientCard({ id, name, projectCount, activeCount, atRisk }: ClientCardProps) {
  return (
    <Link
      href={`/clients/${id}`}
      className={cn(
        'group flex flex-col gap-3 rounded-[10px] border border-border bg-card px-5 py-4 shadow-whisper',
        'transition-colors hover:border-teal/40 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        atRisk && 'border-status-off/30'
      )}
      aria-label={`Teczka klienta: ${name}${atRisk ? ', projekt zagrożony' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-teal transition-colors">
          {name}
        </span>
        {atRisk && (
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-status-off mt-0.5"
            aria-label="Projekt zagrożony"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-meta text-xs">
            {activeCount} aktywnych
          </span>
        </div>
        <span className="font-meta text-[0.65rem] text-muted-foreground/60">·</span>
        <span className="font-meta text-xs text-muted-foreground">
          {projectCount} {projectCount === 1 ? 'projekt' : projectCount < 5 ? 'projekty' : 'projektów'}
        </span>
      </div>
    </Link>
  )
}
