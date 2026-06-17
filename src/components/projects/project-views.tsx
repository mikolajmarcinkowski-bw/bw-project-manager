'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDetail } from '@/lib/data/projects'
import { PhaseStrip } from './phase-strip'
import { ParallelView } from './parallel-view'
import { GanttChart } from './gantt-chart'
import type { Profile } from './task-assignee-control'

// Widok projektu z zakładkami (ekran „Mapa klocków + phase strip" wg 06-wireframes.html).
// Domyślnie „Mapa klocków"; „Harmonogram" = Gantt. Pozostałe zakładki = Faza 3 (empty state).
type Tab = 'mapa' | 'harmonogram' | 'RACI' | 'RAID' | 'Budżet' | 'KPI'

const FUTURE_TABS: Array<'RACI' | 'RAID' | 'Budżet' | 'KPI'> = ['RACI', 'RAID', 'Budżet', 'KPI']

export function ProjectViews({ project, profiles = [] }: { project: ProjectDetail; profiles?: Profile[] }) {
  const [tab, setTab] = useState<Tab>('mapa')

  return (
    <section className="flex flex-col gap-4" aria-label="Widoki projektu">
      {/* Pasek zakładek */}
      <div role="tablist" aria-label="Widoki projektu" className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        <TabPill id="tab-mapa" controls="panel-mapa" active={tab === 'mapa'} onClick={() => setTab('mapa')}>Mapa klocków</TabPill>
        <TabPill id="tab-harmonogram" controls="panel-harmonogram" active={tab === 'harmonogram'} onClick={() => setTab('harmonogram')}>Harmonogram</TabPill>
        {FUTURE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t.toLowerCase()}`}
            aria-controls={`panel-${t.toLowerCase()}`}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-meta text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
              tab === t
                ? 'bg-muted/60 text-muted-foreground border border-border/60'
                : 'text-muted-foreground/50 hover:text-muted-foreground border border-transparent'
            )}
          >
            {t}
          </button>
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
            onSelectStep={() => setTab('harmonogram')}
          />
          <ParallelView steps={project.steps} decisions={project.decisions} />
        </div>
      ) : tab === 'harmonogram' ? (
        <div role="tabpanel" id="panel-harmonogram" aria-labelledby="tab-harmonogram">
          <GanttChart project={project} profiles={profiles} />
        </div>
      ) : (
        /* Faza 3 — zakładka istnieje ale treść jeszcze nie */
        <div
          role="tabpanel"
          id={`panel-${tab.toLowerCase()}`}
          aria-labelledby={`tab-${tab.toLowerCase()}`}
          className="flex flex-col items-center justify-center py-16 gap-3 text-center"
        >
          <Clock className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
          <p className="font-heading font-semibold text-sm text-foreground">
            {tab} — dostępne wkrótce
          </p>
          <p className="font-meta text-xs text-muted-foreground max-w-[28ch]">
            Ta sekcja będzie dostępna w kolejnej wersji aplikacji.
          </p>
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
