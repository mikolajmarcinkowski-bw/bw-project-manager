'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProjectDetail } from '@/lib/data/projects'
import { PhaseStrip } from './phase-strip'
import { ParallelView } from './parallel-view'
import { GanttChart } from './gantt-chart'

// Widok projektu z zakładkami (ekran „Mapa klocków + phase strip" wg 06-wireframes.html).
// Domyślnie „Mapa klocków"; „Harmonogram" = istniejący Gantt. Pozostałe zakładki = Faza 3 (wyłączone).
type Tab = 'mapa' | 'harmonogram'

const FUTURE_TABS = ['RACI', 'RAID', 'Budżet', 'KPI'] as const

export function ProjectViews({ project }: { project: ProjectDetail }) {
  const [tab, setTab] = useState<Tab>('mapa')

  return (
    <section className="flex flex-col gap-4" aria-label="Widoki projektu">
      {/* Pasek zakładek */}
      <div role="tablist" aria-label="Widoki projektu" className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        <TabPill id="tab-mapa" controls="panel-mapa" active={tab === 'mapa'} onClick={() => setTab('mapa')}>Mapa klocków</TabPill>
        <TabPill id="tab-harmonogram" controls="panel-harmonogram" active={tab === 'harmonogram'} onClick={() => setTab('harmonogram')}>Harmonogram</TabPill>
        {FUTURE_TABS.map((t) => (
          <span
            key={t}
            title="Wkrótce (Faza 3)"
            aria-disabled="true"
            className="rounded-full px-3 py-1.5 font-meta text-xs font-medium text-muted-foreground/40 cursor-not-allowed select-none"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Treść zakładki */}
      {tab === 'mapa' ? (
        <div
          role="tabpanel"
          id="panel-mapa"
          aria-labelledby="tab-mapa"
          className="flex flex-col gap-5"
        >
          <PhaseStrip
            steps={project.steps}
            decisions={project.decisions}
            // Klik klocka → szczegóły harmonogramu (checklist zadań = Faza 2c)
            onSelectStep={() => setTab('harmonogram')}
          />
          <ParallelView steps={project.steps} decisions={project.decisions} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-harmonogram" aria-labelledby="tab-harmonogram">
          <GanttChart project={project} />
        </div>
      )}
    </section>
  )
}

function TabPill({
  active,
  onClick,
  children,
  id,
  controls,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  id: string
  controls: string
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 font-meta text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
        active
          ? 'bg-teal/10 text-teal-strong border border-teal/30'
          : 'text-muted-foreground hover:bg-muted border border-transparent'
      )}
    >
      {children}
    </button>
  )
}
