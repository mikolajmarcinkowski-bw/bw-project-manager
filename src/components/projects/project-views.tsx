'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  ProjectDetail,
  Risk,
  Kpi,
  BudgetSettings,
  BudgetLine,
  ChangeRequest,
  RaciTask,
} from '@/lib/data/projects'
import { PhaseStrip } from './phase-strip'
import { ParallelView } from './parallel-view'
import { GanttChart } from './gantt-chart'
import { PhaseChecklist } from './phase-checklist'
import { RaidView } from './raid-view'
import { KpiView } from './kpi-view'
import { BudgetView } from './budget-view'
import { CrView } from './cr-view'
import { RaciView } from './raci-view'
import type { Profile } from './task-assignee-control'

// Wszystkie zakładki dokumentów projektowych aktywne.
type Tab = 'mapa' | 'harmonogram' | 'checklist' | 'RAID' | 'KPI' | 'Budżet' | 'CR' | 'RACI'

export function ProjectViews({
  project,
  profiles = [],
  risks = [],
  kpis = [],
  budget = { settings: null, lines: [] },
  changeRequests = [],
  raci = [],
}: {
  project: ProjectDetail
  profiles?: Profile[]
  risks?: Risk[]
  kpis?: Kpi[]
  budget?: { settings: BudgetSettings | null; lines: BudgetLine[] }
  changeRequests?: ChangeRequest[]
  raci?: RaciTask[]
}) {
  const [tab, setTab] = useState<Tab>('mapa')
  const [targetStepId, setTargetStepId] = useState<string | null>(null)
  const defaultStepId =
    project.steps.find((s) => s.isActive)?.id ??
    project.steps.find((s) => s.status === 'in_progress')?.id ??
    project.steps[0]?.id ??
    null
  const [checklistStepId, setChecklistStepId] = useState<string | null>(defaultStepId)

  function handleSelectStep(stepId: string) {
    setChecklistStepId(stepId)
    setTab('checklist')
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Widoki projektu">
      {/* Pasek zakładek */}
      <div
        role="tablist"
        aria-label="Widoki projektu"
        className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3"
      >
        <TabPill id="tab-mapa" controls="panel-mapa" active={tab === 'mapa'} onClick={() => setTab('mapa')}>
          Mapa klocków
        </TabPill>
        <TabPill id="tab-harmonogram" controls="panel-harmonogram" active={tab === 'harmonogram'} onClick={() => setTab('harmonogram')}>
          Harmonogram
        </TabPill>
        <TabPill id="tab-checklist" controls="panel-checklist" active={tab === 'checklist'} onClick={() => setTab('checklist')}>
          Checklist fazy
        </TabPill>
        <TabPill id="tab-raid" controls="panel-raid" active={tab === 'RAID'} onClick={() => setTab('RAID')}>
          RAID
        </TabPill>
        <TabPill id="tab-kpi" controls="panel-kpi" active={tab === 'KPI'} onClick={() => setTab('KPI')}>
          KPI
        </TabPill>
        <TabPill id="tab-budzet" controls="panel-budzet" active={tab === 'Budżet'} onClick={() => setTab('Budżet')}>
          Budżet
        </TabPill>
        <TabPill id="tab-cr" controls="panel-cr" active={tab === 'CR'} onClick={() => setTab('CR')}>
          CR
        </TabPill>
        <TabPill id="tab-raci" controls="panel-raci" active={tab === 'RACI'} onClick={() => setTab('RACI')}>
          RACI
        </TabPill>
      </div>

      {/* Treść zakładki */}
      {tab === 'mapa' ? (
        <div role="tabpanel" id="panel-mapa" aria-labelledby="tab-mapa" className="flex flex-col gap-5">
          <PhaseStrip steps={project.steps} decisions={project.decisions} onSelectStep={handleSelectStep} />
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
              <p className="font-meta text-xs text-muted-foreground py-8 text-center">Nie znaleziono fazy.</p>
            )
          })()}
        </div>
      ) : tab === 'RAID' ? (
        <div role="tabpanel" id="panel-raid" aria-labelledby="tab-raid">
          <RaidView projectId={project.id} initialRisks={risks} />
        </div>
      ) : tab === 'KPI' ? (
        <div role="tabpanel" id="panel-kpi" aria-labelledby="tab-kpi">
          <KpiView projectId={project.id} initialKpis={kpis} initialMilestones={project.milestones} />
        </div>
      ) : tab === 'Budżet' ? (
        <div role="tabpanel" id="panel-budzet" aria-labelledby="tab-budzet">
          <BudgetView projectId={project.id} initialBudget={budget} />
        </div>
      ) : tab === 'CR' ? (
        <div role="tabpanel" id="panel-cr" aria-labelledby="tab-cr">
          <CrView projectId={project.id} initialCrs={changeRequests} />
        </div>
      ) : tab === 'RACI' ? (
        <div role="tabpanel" id="panel-raci" aria-labelledby="tab-raci">
          <RaciView projectId={project.id} initialRaci={raci} />
        </div>
      ) : (
        <div role="tabpanel" id={`panel-${tab.toLowerCase()}`} aria-labelledby={`tab-${tab.toLowerCase()}`}
          className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="font-heading font-semibold text-sm text-foreground">{tab} — dostępne wkrótce</p>
        </div>
      )}
    </section>
  )
}

function TabPill({
  active, onClick, children, id, controls,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; id: string; controls: string
}) {
  return (
    <button
      type="button" role="tab" id={id} aria-controls={controls} aria-selected={active} onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 font-meta text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
        active ? 'bg-teal/10 text-teal-strong border border-teal/30' : 'text-muted-foreground hover:bg-muted border border-transparent'
      )}
    >
      {children}
    </button>
  )
}
