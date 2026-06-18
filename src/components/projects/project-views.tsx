'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectDetail, Risk, Kpi } from '@/lib/data/projects'
import { PhaseStrip } from './phase-strip'
import { ParallelView } from './parallel-view'
import { GanttChart } from './gantt-chart'
import { PhaseChecklist } from './phase-checklist'
import { RaidView } from './raid-view'
import { KpiView } from './kpi-view'
import type { Profile } from './task-assignee-control'

// Widok projektu z zakładkami (ekran „Mapa klocków + phase strip" wg 06-wireframes.html).
// Domyślnie „Mapa klocków"; „Harmonogram" = Gantt; „checklist" = Ekran 7 po kliknięciu klocka.
// RAID i KPI = pełne interaktywne widoki.
type Tab = 'mapa' | 'harmonogram' | 'checklist' | 'RACI' | 'RAID' | 'Budżet' | 'KPI'

const FUTURE_TABS: Array<'RACI' | 'Budżet'> = ['RACI', 'Budżet']

export function ProjectViews({
  project,
  profiles = [],
  risks = [],
  kpis = [],
}: {
  project: ProjectDetail
  profiles?: Profile[]
  risks?: Risk[]
  kpis?: Kpi[]
}) {
  const [tab, setTab] = useState<Tab>('mapa')
  const [targetStepId, setTargetStepId] = useState<string | null>(null)
  // Ekran 7: domyślnie pierwsza aktywna faza lub pierwsza faza projektu
  const defaultStepId = project.steps.find(s => s.isActive)?.id
    ?? project.steps.find(s => s.status === 'in_progress')?.id
    ?? project.steps[0]?.id
    ?? null
  const [checklistStepId, setChecklistStepId] = useState<string | null>(defaultStepId)

  function handleSelectStep(stepId: string) {
    setChecklistStepId(stepId)
    setTab('checklist')
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Widoki projektu">
      {/* Pasek zakładek */}
      <div role="tablist" aria-label="Widoki projektu" className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        <TabPill id="tab-mapa" controls="panel-mapa" active={tab === 'mapa'} onClick={() => setTab('mapa')}>Mapa klocków</TabPill>
        <TabPill id="tab-harmonogram" controls="panel-harmonogram" active={tab === 'harmonogram'} onClick={() => setTab('harmonogram')}>Harmonogram</TabPill>
        <TabPill
          id="tab-checklist"
          controls="panel-checklist"
          active={tab === 'checklist'}
          onClick={() => setTab('checklist')}
        >
          Checklist fazy
        </TabPill>
        <TabPill id="tab-raid" controls="panel-raid" active={tab === 'RAID'} onClick={() => setTab('RAID')}>RAID</TabPill>
        <TabPill id="tab-kpi" controls="panel-kpi" active={tab === 'KPI'} onClick={() => setTab('KPI')}>KPI</TabPill>
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
            onSelectStep={handleSelectStep}
          />
          <ParallelView steps={project.steps} decisions={project.decisions} />
        </div>
      ) : tab === 'harmonogram' ? (
        <div role="tabpanel" id="panel-harmonogram" aria-labelledby="tab-harmonogram">
          <GanttChart
            project={project}
            profiles={profiles}
            targetStepId={targetStepId}
            onTargetConsumed={() => setTargetStepId(null)}
          />
        </div>
      ) : tab === 'checklist' && checklistStepId !== null ? (
        <div role="tabpanel" id="panel-checklist" aria-labelledby="tab-checklist">
          {(() => {
            const selectedStep = project.steps.find((s) => s.id === checklistStepId)
            return selectedStep ? (
              <PhaseChecklist
                step={selectedStep}
                profiles={profiles}
                allSteps={project.steps}
                onSelectStep={(stepId) => setChecklistStepId(stepId)}
              />
            ) : (
              <p className="font-meta text-xs text-muted-foreground py-8 text-center">
                Nie znaleziono fazy.
              </p>
            )
          })()}
        </div>
      ) : tab === 'RAID' ? (
        <div role="tabpanel" id="panel-raid" aria-labelledby="tab-raid">
          <RaidView projectId={project.id} initialRisks={risks} />
        </div>
      ) : tab === 'KPI' ? (
        <div role="tabpanel" id="panel-kpi" aria-labelledby="tab-kpi">
          <KpiView
            projectId={project.id}
            initialKpis={kpis}
            initialMilestones={project.milestones}
          />
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
