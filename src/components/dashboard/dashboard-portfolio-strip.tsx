// Server Component — brak 'use client'. Pokazuje 4 chipsty statystyk portfolia.

import { Activity, AlertTriangle, CalendarCheck, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPortfolioStripProps {
  totalActive: number
  atRiskCount: number
  tasksTodayCount: number
  upcomingMilestonesCount: number
}

export function DashboardPortfolioStrip({
  totalActive,
  atRiskCount,
  tasksTodayCount,
  upcomingMilestonesCount,
}: DashboardPortfolioStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="list" aria-label="Statystyki portfolia">

      {/* Aktywne projekty */}
      <div
        role="listitem"
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 border-border bg-card text-foreground"
      >
        <Activity className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold leading-none">{totalActive}</span>
          <span className="font-meta text-xs text-muted-foreground leading-tight">Aktywne projekty</span>
        </div>
      </div>

      {/* Zagrożone */}
      <div
        role="listitem"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5',
          atRiskCount > 0
            ? 'border-status-off/30 bg-status-off/5 text-status-off'
            : 'border-border bg-card text-muted-foreground'
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold leading-none">{atRiskCount}</span>
          <span className="font-meta text-xs leading-tight opacity-80">Zagrożone</span>
        </div>
      </div>

      {/* Zadania dziś */}
      <div
        role="listitem"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5',
          tasksTodayCount > 0
            ? 'border-status-at/30 bg-status-at/5 text-status-at'
            : 'border-border bg-card text-muted-foreground'
        )}
      >
        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold leading-none">{tasksTodayCount}</span>
          <span className="font-meta text-xs leading-tight opacity-80">Zadania dziś</span>
        </div>
      </div>

      {/* Kamienie (14 dni) */}
      <div
        role="listitem"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5',
          upcomingMilestonesCount > 0
            ? 'border-teal/30 bg-teal/5 text-teal'
            : 'border-border bg-card text-muted-foreground'
        )}
      >
        <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold leading-none">{upcomingMilestonesCount}</span>
          <span className="font-meta text-xs leading-tight opacity-80">Kamienie (14 dni)</span>
        </div>
      </div>

    </div>
  )
}
