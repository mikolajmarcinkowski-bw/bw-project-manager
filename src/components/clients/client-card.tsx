import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ClientCardProps {
  id: string
  name: string
  projectCount: number
  activeCount: number
  atRisk: boolean
}

// Folder z Tabler Icons (MIT, public/folder.svg) — inline, by tintować przez currentColor.
function FolderGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" />
    </svg>
  )
}

export function ClientCard({ id, name, projectCount, activeCount, atRisk }: ClientCardProps) {
  return (
    <Link
      href={`/clients/${id}`}
      className={cn(
        'group flex items-start gap-3 rounded-[10px] border bg-card px-4 py-4 shadow-whisper',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-whisper-lg active:translate-y-0 active:shadow-whisper',
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        atRisk
          ? 'border-status-off/60 bg-status-off/5 hover:border-status-off/70'
          : 'border-border hover:border-teal/40'
      )}
      aria-label={`Teczka klienta: ${name}${atRisk ? ', projekt zagrożony' : ''}`}
    >
      {/* Folder (teczka) — motyw graficzny */}
      <FolderGlyph
        className={cn(
          'h-9 w-9 shrink-0 transition-all duration-200 ease-out group-hover:-translate-y-px',
          atRisk ? 'text-status-off' : 'text-teal group-hover:text-teal-strong'
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-teal-strong">
            {name}
          </span>
          {atRisk && (
            <span className="flex shrink-0 items-center gap-1 text-status-off">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="font-meta text-[0.65rem] font-semibold uppercase tracking-wide">
                Zagrożony
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 font-meta text-xs text-muted-foreground">
          <span>{activeCount} aktywnych</span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            {projectCount} {projectCount === 1 ? 'projekt' : projectCount < 5 ? 'projekty' : 'projektów'}
          </span>
        </div>
      </div>
    </Link>
  )
}
