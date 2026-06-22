// Server Component — brak 'use client'. Pokazuje 2 chipsy statystyk portfolia.

import { Activity, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPortfolioStripProps {
  totalActive: number
  upcomingMilestonesCount: number
}

export function DashboardPortfolioStrip({
  totalActive,
  upcomingMilestonesCount,
}: DashboardPortfolioStripProps) {
  const chips = [
    {
      icon: <Activity className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />,
      value: totalActive,
      label: 'Aktywne projekty',
      className: 'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 border-border bg-card text-foreground',
    },
    {
      icon: <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />,
      value: upcomingMilestonesCount,
      label: 'Kamienie (14 dni)',
      className: cn(
        'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5',
        upcomingMilestonesCount > 0
          ? 'border-teal/30 bg-teal/5 text-teal'
          : 'border-border bg-card text-muted-foreground'
      ),
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3" role="list" aria-label="Statystyki portfolia">
      {chips.map((chip, i) => (
        <div
          key={chip.label}
          role="listitem"
          className={cn(
            chip.className,
            'motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:duration-500'
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {chip.icon}
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold leading-none">{chip.value}</span>
            <span className="font-meta text-xs leading-tight opacity-80">{chip.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
