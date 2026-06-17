import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ClientCardProps {
  id: string
  name: string
  projectCount: number
  activeCount: number
  atRisk: boolean
  /** Pozycja w siatce — steruje kaskadą wejścia (stagger). */
  index?: number
}

// Teczka-folder, która UCHYLA SIĘ na hover (sygnaturowy ruch dashboardu).
// Złożona z warstw CSS: tylna ścianka + zakładka, dwie stałe kartki (głębia,
// nie liczność) i przednia klapka odchylana w 3D. Ruch przez group-hover Linku.
function FolderGlyph({ atRisk }: { atRisk: boolean }) {
  const body = atRisk ? 'bg-status-off' : 'bg-teal'
  return (
    <span
      className="relative block h-[34px] w-[42px] shrink-0 [perspective:340px]"
      aria-hidden="true"
    >
      {/* Zakładka */}
      <span className={cn('absolute left-0 top-0 h-2.5 w-5 rounded-t-[5px]', body)} />
      {/* Tylna ścianka */}
      <span className={cn('absolute inset-x-0 bottom-0 top-1.5 rounded-[6px]', body)} />
      {/* Kartki (stała głębia: jest coś w środku). Feedback: w dark mode papier
          powinien być biały/jasny żeby kontrastował z ciemną teczką. */}
      <span className="absolute inset-x-[7px] top-[6px] h-[19px] rounded-[3px] bg-[oklch(0.90_0.007_236)] transition-transform duration-300 ease-out group-hover:-translate-y-[3px] dark:bg-[oklch(0.82_0.006_236)]" />
      <span className="absolute inset-x-[5px] top-[10px] h-[19px] rounded-[3px] bg-[oklch(0.985_0.004_236)] shadow-[0_2px_3px_rgba(20,20,20,0.12)] transition-transform duration-300 ease-out group-hover:-translate-y-[7px] dark:bg-[oklch(0.94_0.004_236)]" />
      {/* Przednia klapka — odchyla się do przodu (rotateX) odsłaniając kartki */}
      <span
        className={cn(
          'absolute inset-x-0 bottom-0 top-3 origin-bottom rounded-[6px] border-t border-white/15',
          'transition-transform duration-300 ease-out [transform-style:preserve-3d]',
          'group-hover:[transform:rotateX(-30deg)]',
          body
        )}
      />
    </span>
  )
}

export function ClientCard({ id, name, projectCount, activeCount, atRisk, index }: ClientCardProps) {
  return (
    <Link
      href={`/clients/${id}`}
      style={index != null ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : undefined}
      className={cn(
        'group flex items-start gap-3 rounded-[10px] border bg-card px-4 py-4 shadow-whisper',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-whisper-lg active:translate-y-0 active:shadow-whisper',
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        // Wejście: tylko gdy ruch dozwolony; baza = w pełni widoczna (fail-safe).
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500',
        atRisk
          ? 'border-status-off/60 bg-status-off/5 hover:border-status-off/70'
          : 'border-border hover:border-teal/40'
      )}
      aria-label={`Teczka klienta: ${name}${atRisk ? ', projekt zagrożony' : ''}`}
    >
      <FolderGlyph atRisk={atRisk} />

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
