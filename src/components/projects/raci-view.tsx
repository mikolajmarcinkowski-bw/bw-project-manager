'use client'

import { useState, useTransition, Fragment } from 'react'
import { cn } from '@/lib/utils'
import type { RaciTask, RaciValue, RaciAssignment } from '@/lib/data/projects'
import { updateRaciRole } from '@/lib/actions/documents'

interface RaciViewProps {
  projectId: string
  initialRaci: RaciTask[]
}

const ROLES = ['SP', 'PM', 'ARCH', 'SPEC', 'BPO', 'IT', 'USR', 'QA'] as const
type Role = typeof ROLES[number]

const ROLE_FULL: Record<Role, string> = {
  SP: 'Sponsor projektu',
  PM: 'Project Manager',
  ARCH: 'Architekt/Lead',
  SPEC: 'Specjalista BW',
  BPO: 'Business Process Owner',
  IT: 'IT Klienta',
  USR: 'Użytkownicy końcowi',
  QA: 'QA / Tester',
}

const RACI_BADGE: Record<RaciValue, { cls: string }> = {
  R: { cls: 'bg-[#FCEBEB] text-[#A32D2D] border-[#E24B4A]' },
  A: { cls: 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]' },
  C: { cls: 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]' },
  I: { cls: 'bg-[#EBF2F9] text-[#185FA5] border-[#378ADD]' },
}

// Cycle order: undefined/— → R → A → C → I → —
const CYCLE: (RaciValue | '-')[] = ['R', 'A', 'C', 'I', '-']

function nextInCycle(current: RaciValue | undefined): RaciValue | '-' {
  if (!current) return 'R'
  const idx = CYCLE.indexOf(current)
  return CYCLE[(idx + 1) % CYCLE.length]
}

function EmptyRaciState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-lg">
      <p className="font-heading font-semibold text-sm text-foreground">Macierz RACI jest pusta</p>
      <p className="font-meta text-xs text-muted-foreground max-w-[44ch]">
        Macierz RACI zostanie uzupełniona przez Claude podczas setup projektu.
        <br />
        Użyj:&nbsp;
        <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">update_raci_roles</code>
      </p>
    </div>
  )
}

export function RaciView({ projectId: _projectId, initialRaci }: RaciViewProps) {
  // Build state: Map<taskId, Map<role, raci>>
  const buildState = (tasks: RaciTask[]): Map<string, Map<string, RaciValue>> => {
    const m = new Map<string, Map<string, RaciValue>>()
    for (const t of tasks) {
      const rm = new Map<string, RaciValue>()
      for (const a of t.assignments) {
        rm.set(a.role, a.raci)
      }
      m.set(t.taskId, rm)
    }
    return m
  }

  const [tasks] = useState<RaciTask[]>(initialRaci)
  const [raciState, setRaciState] = useState<Map<string, Map<string, RaciValue>>>(
    buildState(initialRaci)
  )
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  function handleCellClick(taskId: string, role: string) {
    const taskRoles = raciState.get(taskId) ?? new Map<string, RaciValue>()
    const current = taskRoles.get(role)
    const next = nextInCycle(current)

    // Optimistic update
    setRaciState((prev) => {
      const copy = new Map(prev)
      const roleCopy = new Map(copy.get(taskId) ?? new Map<string, RaciValue>())
      if (next === '-') {
        roleCopy.delete(role)
      } else {
        roleCopy.set(role, next)
      }
      copy.set(taskId, roleCopy)
      return copy
    })

    startTransition(async () => {
      await updateRaciRole(taskId, role, next)
    })
  }

  // Group tasks by phase
  const phaseMap = new Map<number, { phaseName: string; tasks: RaciTask[] }>()
  for (const t of tasks) {
    const existing = phaseMap.get(t.phaseNumber)
    if (existing) {
      existing.tasks.push(t)
    } else {
      phaseMap.set(t.phaseNumber, { phaseName: t.phaseName, tasks: [t] })
    }
  }

  // Filter
  const filteredPhases = Array.from(phaseMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([phaseNum, { phaseName, tasks: pTasks }]) => ({
      phaseNum,
      phaseName,
      tasks: pTasks.filter((t) => {
        const matchSearch = !search || t.taskTitle.toLowerCase().includes(search.toLowerCase())
        const matchFilter =
          filter === 'all' || phaseName.toLowerCase().includes(filter.toLowerCase())
        return matchSearch && matchFilter
      }),
    }))
    .filter((p) => p.tasks.length > 0)

  const totalVisible = filteredPhases.reduce((s, p) => s + p.tasks.length, 0)

  if (tasks.length === 0) {
    return <EmptyRaciState />
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'crm', 'spo', 'int', 'mkt', 'erp'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 font-meta text-xs font-semibold border transition-colors',
              filter === f
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-background text-muted-foreground border-border hover:border-teal hover:text-teal'
            )}
          >
            {f === 'all' ? 'Wszystkie' : f.toUpperCase()}
          </button>
        ))}
        <span className="ml-1 bg-[#f0faf7] border border-teal/30 rounded px-2.5 py-0.5 font-meta text-[10px] text-[#0F6E56] font-semibold">
          {totalVisible} zadań
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj zadania…"
          className="ml-auto border border-border rounded-full px-3 py-1.5 font-meta text-xs bg-background focus:outline-none focus:border-teal w-48"
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap font-meta text-[10px] text-muted-foreground px-1">
        {(Object.keys(RACI_BADGE) as RaciValue[]).map((v) => (
          <span key={v} className="flex items-center gap-1.5">
            <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border', RACI_BADGE[v].cls)}>
              {v}
            </span>
            <span>{v === 'R' ? 'Responsible' : v === 'A' ? 'Accountable' : v === 'C' ? 'Consulted' : 'Informed'}</span>
          </span>
        ))}
        <span className="text-muted-foreground/50">Kliknij komórkę — zmień rolę</span>
      </div>

      {/* RACI Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              {/* Role legend bar */}
              <tr className="bg-[#171717]">
                <th className="text-white px-2.5 py-2 text-center w-10 font-bold">#</th>
                <th className="text-white px-2.5 py-2 text-left min-w-[240px] font-bold">Zadanie / Aktywność</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-white px-2 py-2 text-center w-14 font-bold" title={ROLE_FULL[role]}>
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPhases.map(({ phaseNum, phaseName, tasks: pTasks }) => (
                <Fragment key={`phase-${phaseNum}`}>
                  <tr className="bg-[#f2f2f2] dark:bg-muted/30">
                    <td colSpan={ROLES.length + 2} className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-foreground/70">
                      Faza {phaseNum} — {phaseName}
                    </td>
                  </tr>
                  {pTasks.map((t, ti) => {
                    const taskRoles = raciState.get(t.taskId) ?? new Map<string, RaciValue>()
                    return (
                      <tr
                        key={t.taskId}
                        className={cn(
                          'border-b border-border/50 hover:bg-muted/20 transition-colors',
                          ti % 2 === 1 && 'bg-muted/10'
                        )}
                      >
                        <td className="px-2.5 py-2 text-center text-muted-foreground">{ti + 1}</td>
                        <td className="px-2.5 py-2 text-left leading-snug">
                          <span className="text-foreground">{t.taskTitle}</span>
                          {t.stepTitle && t.stepTitle !== t.taskTitle && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5 italic">
                              {t.stepTitle}
                            </span>
                          )}
                        </td>
                        {ROLES.map((role) => {
                          const val = taskRoles.get(role)
                          return (
                            <td key={role} className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleCellClick(t.taskId, role)}
                                className={cn(
                                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border transition-all hover:scale-110',
                                  val
                                    ? RACI_BADGE[val].cls
                                    : 'border-transparent text-muted-foreground/30 hover:border-border hover:text-muted-foreground'
                                )}
                                aria-label={`${t.taskTitle} — ${role}: ${val ?? '—'}`}
                                title={val ? `${role}: ${val} — kliknij aby zmienić` : `${role} — kliknij aby przypisać`}
                              >
                                {val ?? '—'}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
