'use client'

import { useState, useTransition, Fragment } from 'react'
import { cn } from '@/lib/utils'
import type { BudgetSettings, BudgetLine, RateType } from '@/lib/data/projects'
import {
  setBudgetSettings,
  addBudgetLine,
  updateBudgetLineActual,
  deleteBudgetLine,
} from '@/lib/actions/documents'

interface BudgetViewProps {
  projectId: string
  initialBudget: { settings: BudgetSettings | null; lines: BudgetLine[] }
}

type RateFilter = 'all' | 'K' | 'W' | 'D'

const RATE_BADGE: Record<RateType, { label: string; cls: string }> = {
  K: { label: 'K', cls: 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]' },
  W: { label: 'W', cls: 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]' },
  D: { label: 'D', cls: 'bg-[#EBF2F9] text-[#185FA5] border-[#378ADD]' },
}

const FILTER_BTNS: { key: RateFilter; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'K', label: 'K — Konsultant' },
  { key: 'W', label: 'W — Warsztat' },
  { key: 'D', label: 'D — Deweloper' },
]

function fmtH(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtPLN(n: number): string {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' zł'
}

function burnColor(pct: number): string {
  if (pct > 90) return 'text-[#A32D2D]'
  if (pct > 75) return 'text-[#854F0B]'
  return 'text-[#0F6E56]'
}

function burnBarColor(pct: number): string {
  if (pct > 90) return 'bg-[#E24B4A]'
  if (pct > 75) return 'bg-[#EF9F27]'
  return 'bg-[#28B39B]'
}

function getRateValue(rateType: RateType, settings: BudgetSettings | null): number {
  if (!settings) return 0
  if (rateType === 'K') return settings.rateK ?? 0
  if (rateType === 'W') return settings.rateW ?? 0
  return settings.rateD ?? 0
}

// Group lines by phase
function groupByPhase(lines: BudgetLine[]): Map<string, BudgetLine[]> {
  const map = new Map<string, BudgetLine[]>()
  for (const l of lines) {
    const key = l.phase ?? 'Bez etapu'
    const arr = map.get(key) ?? []
    arr.push(l)
    map.set(key, arr)
  }
  return map
}

export function BudgetView({ projectId, initialBudget }: BudgetViewProps) {
  const [settings, setSettings] = useState<BudgetSettings | null>(initialBudget.settings)
  const [lines, setLines] = useState<BudgetLine[]>(initialBudget.lines)
  const [filter, setFilter] = useState<RateFilter>('all')
  const [settingsOpen, setSettingsOpen] = useState(!initialBudget.settings)
  const [showAddModal, setShowAddModal] = useState(false)

  // Settings form state
  const [rateK, setRateK] = useState(String(initialBudget.settings?.rateK ?? ''))
  const [rateW, setRateW] = useState(String(initialBudget.settings?.rateW ?? ''))
  const [rateD, setRateD] = useState(String(initialBudget.settings?.rateD ?? ''))
  const [bufferPct, setBufferPct] = useState(String(initialBudget.settings?.bufferPct ?? '0'))
  const [pmPct, setPmPct] = useState(String(initialBudget.settings?.pmOverheadPct ?? '20'))
  const [budgetMax, setBudgetMax] = useState(String(initialBudget.settings?.budgetMax ?? ''))
  const [settingsError, setSettingsError] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Add line form state
  const [newPhase, setNewPhase] = useState('')
  const [newRateType, setNewRateType] = useState<RateType>('K')
  const [newEstH, setNewEstH] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addError, setAddError] = useState('')

  const bufPct = parseFloat(bufferPct) || 0
  const pmOverhead = parseFloat(pmPct) || 0

  // Apply filter to lines (filter by rate_type)
  const filteredLines =
    filter === 'all'
      ? lines
      : lines.filter((l) => l.rateType === filter)

  const grouped = groupByPhase(filteredLines)

  // Compute KPIs over all lines
  const allGrouped = groupByPhase(lines)
  let grandEstH = 0
  let grandActH = 0
  let grandEstV = 0
  let grandActV = 0

  for (const [, phLines] of allGrouped) {
    let phEstH = 0
    let phActH = 0
    let phEstV = 0
    let phActV = 0
    for (const l of phLines) {
      const est = (l.estH ?? 0) * (1 + bufPct / 100)
      const act = l.actualH ?? 0
      const rate = getRateValue(l.rateType, settings)
      phEstH += est
      phActH += act
      phEstV += est * rate
      phActV += act * rate
    }
    const pmEst = phEstH * (pmOverhead / 100)
    const pmAct = phActH * (pmOverhead / 100)
    const pmRate = settings?.rateK ?? 0
    grandEstH += phEstH + pmEst
    grandActH += phActH + pmAct
    grandEstV += phEstV + pmEst * pmRate
    grandActV += phActV + pmAct * pmRate
  }

  const burnPct = grandEstH > 0 ? (grandActH / grandEstH) * 100 : 0

  function handleSaveSettings() {
    const k = parseFloat(rateK)
    const w = parseFloat(rateW)
    const d = parseFloat(rateD)
    if (isNaN(k) || isNaN(w) || isNaN(d)) {
      setSettingsError('Stawki K, W, D są wymagane.')
      return
    }
    setSettingsError('')
    startTransition(async () => {
      const res = await setBudgetSettings(projectId, {
        rate_k: k,
        rate_w: w,
        rate_d: d,
        buffer_pct: parseFloat(bufferPct) || 0,
        pm_overhead_pct: parseFloat(pmPct) || 0,
        budget_max: parseFloat(budgetMax) || undefined,
      })
      if ('error' in res) {
        setSettingsError(res.error)
      } else {
        setSettings({
          projectId,
          rateK: k,
          rateW: w,
          rateD: d,
          bufferPct: parseFloat(bufferPct) || 0,
          pmOverheadPct: parseFloat(pmPct) || 0,
          budgetMax: parseFloat(budgetMax) || null,
        })
        setSettingsOpen(false)
      }
    })
  }

  function handleAddLine() {
    if (!newPhase.trim()) { setAddError('Etap jest wymagany.'); return }
    const h = parseFloat(newEstH)
    if (isNaN(h) || h <= 0) { setAddError('Estymacja musi być liczbą > 0.'); return }
    setAddError('')
    startTransition(async () => {
      const res = await addBudgetLine(projectId, {
        phase: newPhase.trim(),
        rate_type: newRateType,
        est_h: h,
        description: newDesc.trim() || undefined,
      })
      if ('error' in res) {
        setAddError(res.error)
      } else {
        setLines((prev) => [...prev, {
          id: res.id,
          projectId,
          taskId: null,
          phase: newPhase.trim(),
          rateType: newRateType,
          estH: h,
          actualH: 0,
          description: newDesc.trim() || null,
          createdAt: new Date().toISOString(),
        }])
        setNewPhase('')
        setNewEstH('')
        setNewDesc('')
        setShowAddModal(false)
      }
    })
  }

  function handleActualChange(lineId: string, val: number) {
    // Zapamiętaj poprzednią wartość do rollbacku
    const prevActualH = lines.find((l) => l.id === lineId)?.actualH ?? 0
    // Optimistic update
    setInlineError(null)
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, actualH: val } : l))
    )
    startTransition(async () => {
      const res = await updateBudgetLineActual(lineId, val)
      if ('error' in res) {
        // Rollback: przywróć poprzednią wartość
        setLines((prev) =>
          prev.map((l) => (l.id === lineId ? { ...l, actualH: prevActualH } : l))
        )
        setInlineError(`Nie udało się zapisać: ${res.error}`)
      }
    })
  }

  function handleDeleteLine(lineId: string) {
    setLines((prev) => prev.filter((l) => l.id !== lineId))
    startTransition(async () => {
      await deleteBudgetLine(lineId)
    })
  }

  if (lines.length === 0 && !settings) {
    return (
      <EmptyBudget onConfigure={() => setSettingsOpen(true)} settingsOpen={settingsOpen}>
        {settingsOpen && (
          <SettingsPanel
            rateK={rateK} setRateK={setRateK}
            rateW={rateW} setRateW={setRateW}
            rateD={rateD} setRateD={setRateD}
            bufferPct={bufferPct} setBufferPct={setBufferPct}
            pmPct={pmPct} setPmPct={setPmPct}
            budgetMax={budgetMax} setBudgetMax={setBudgetMax}
            onSave={handleSaveSettings}
            isPending={isPending}
            error={settingsError}
          />
        )}
      </EmptyBudget>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Settings panel (collapsible) */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSettingsOpen((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
        >
          <span className="font-meta text-xs font-semibold text-foreground">
            Ustawienia stawek
            {settings && (
              <span className="ml-2 text-muted-foreground font-normal">
                K={settings.rateK} · W={settings.rateW} · D={settings.rateD} zł/h
              </span>
            )}
          </span>
          <span className="font-meta text-xs text-muted-foreground">{settingsOpen ? '▲' : '▼'}</span>
        </button>
        {settingsOpen && (
          <div className="border-t border-border p-4">
            <SettingsPanel
              rateK={rateK} setRateK={setRateK}
              rateW={rateW} setRateW={setRateW}
              rateD={rateD} setRateD={setRateD}
              bufferPct={bufferPct} setBufferPct={setBufferPct}
              pmPct={pmPct} setPmPct={setPmPct}
              budgetMax={budgetMax} setBudgetMax={setBudgetMax}
              onSave={handleSaveSettings}
              isPending={isPending}
              error={settingsError}
            />
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Estymacja"
          value={`${fmtH(grandEstH)} h`}
          sub="wszystkie etapy"
          accent="teal"
        />
        <KpiCard
          label="Przepracowane"
          value={`${fmtH(grandActH)} h`}
          sub={`${burnPct.toFixed(0)}% estymacji`}
          accent={burnPct > 90 ? 'red' : burnPct > 75 ? 'amber' : 'teal'}
          progress={{ value: burnPct, color: burnBarColor(burnPct) }}
        />
        <KpiCard
          label="Wartość est."
          value={fmtPLN(grandEstV)}
          sub="netto PLN"
          accent="teal"
        />
        <KpiCard
          label="Burn rate"
          value={`${burnPct.toFixed(0)}%`}
          sub="est. vs przepracowane"
          accent={burnPct > 90 ? 'red' : burnPct > 75 ? 'amber' : 'teal'}
          valueClass={burnColor(burnPct)}
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Typ:
        </span>
        {FILTER_BTNS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1 font-meta text-xs font-semibold border transition-colors',
              filter === f.key
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-background text-muted-foreground border-border hover:border-teal hover:text-teal'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Budget table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-[#171717]">
                <th className="text-white px-2.5 py-2 text-center font-bold tracking-wide w-10">#</th>
                <th className="text-white px-2.5 py-2 text-left font-bold tracking-wide min-w-[200px]">Zadanie / Etap</th>
                <th className="text-white px-2.5 py-2 text-center font-bold tracking-wide w-16">Stawka</th>
                <th className="text-white px-2.5 py-2 text-right font-bold tracking-wide w-20">Est. (h)</th>
                <th className="text-white px-2.5 py-2 text-right font-bold tracking-wide w-24">Rzeczyw. (h)</th>
                <th className="text-white px-2.5 py-2 text-right font-bold tracking-wide w-24">Stawka (zł/h)</th>
                <th className="text-white px-2.5 py-2 text-right font-bold tracking-wide w-28">Wart. est.</th>
                <th className="text-white px-2.5 py-2 text-right font-bold tracking-wide w-28">Wart. rzeczyw.</th>
                <th className="text-white px-2.5 py-2 text-left font-bold tracking-wide w-28">Burn %</th>
                <th className="text-white px-2.5 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([phase, phLines], phIdx) => {
                let phEstH = 0, phActH = 0, phEstV = 0, phActV = 0
                for (const l of phLines) {
                  const est = (l.estH ?? 0) * (1 + bufPct / 100)
                  const act = l.actualH ?? 0
                  const rate = getRateValue(l.rateType, settings)
                  phEstH += est; phActH += act
                  phEstV += est * rate; phActV += act * rate
                }
                const pmEstH = phEstH * (pmOverhead / 100)
                const pmActH = phActH * (pmOverhead / 100)
                const pmRate = settings?.rateK ?? 0
                const pmEstV = pmEstH * pmRate
                const pmActV = pmActH * pmRate

                return (
                  <Fragment key={phase}>
                    {/* Phase header */}
                    <tr className="bg-[#f0f0f0] dark:bg-muted/30">
                      <td colSpan={10} className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-foreground/70">
                        {phase}
                      </td>
                    </tr>

                    {/* Lines */}
                    {phLines.map((l, li) => {
                      const bufEst = (l.estH ?? 0) * (1 + bufPct / 100)
                      const act = l.actualH ?? 0
                      const rate = getRateValue(l.rateType, settings)
                      const estV = bufEst * rate
                      const actV = act * rate
                      const pct = bufEst > 0 ? (act / bufEst) * 100 : 0
                      const rowNum = phIdx * 100 + li + 1

                      return (
                        <tr
                          key={l.id}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-2.5 py-2 text-center text-muted-foreground">{rowNum}</td>
                          <td className="px-2.5 py-2 text-left leading-snug">
                            {l.description || `${l.phase} — linia ${li + 1}`}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <RateBadge type={l.rateType} />
                          </td>
                          <td className="px-2.5 py-2 text-right tabular-nums">{fmtH(bufEst)}</td>
                          <td className="px-2.5 py-2 text-right">
                            <EditableActual
                              value={act}
                              onChange={(v) => handleActualChange(l.id, v)}
                            />
                          </td>
                          <td className="px-2.5 py-2 text-right tabular-nums">{rate > 0 ? rate.toLocaleString('pl-PL') : '—'}</td>
                          <td className="px-2.5 py-2 text-right tabular-nums">{rate > 0 ? fmtPLN(estV) : '—'}</td>
                          <td className="px-2.5 py-2 text-right tabular-nums">{rate > 0 ? fmtPLN(actV) : '—'}</td>
                          <td className="px-2.5 py-2">
                            <BurnBar pct={pct} actual={act} est={bufEst} />
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(l.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                              aria-label="Usuń linię"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Subtotal */}
                    <tr className="bg-muted/20 font-semibold">
                      <td></td>
                      <td className="px-3 py-1.5 text-left text-[11px]">Suma etapu</td>
                      <td></td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtH(phEstH)}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtH(phActH)}</td>
                      <td></td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtPLN(phEstV)}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtPLN(phActV)}</td>
                      <td></td>
                      <td></td>
                    </tr>

                    {/* PM narzut row */}
                    {pmOverhead > 0 && (
                      <tr className="bg-[#f0faf7] dark:bg-teal/5 italic text-[#0F6E56] dark:text-teal">
                        <td></td>
                        <td className="px-3 py-1.5 text-left text-[11px]">PM narzut ({pmOverhead}%)</td>
                        <td className="px-2.5 py-1.5 text-center"><RateBadge type="K" /></td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtH(pmEstH)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtH(pmActH)}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{pmRate > 0 ? pmRate.toLocaleString('pl-PL') : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{pmRate > 0 ? fmtPLN(pmEstV) : '—'}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{pmRate > 0 ? fmtPLN(pmActV) : '—'}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}

              {/* Grand total */}
              {lines.length > 0 && (
                <tr className="bg-[#171717] text-white font-bold">
                  <td></td>
                  <td className="px-3 py-2 text-left text-xs tracking-wide">SUMA CAŁKOWITA</td>
                  <td></td>
                  <td className="px-2.5 py-2 text-right tabular-nums">{fmtH(grandEstH)}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums">{fmtH(grandActH)}</td>
                  <td></td>
                  <td className="px-2.5 py-2 text-right tabular-nums">{fmtPLN(grandEstV)}</td>
                  <td className="px-2.5 py-2 text-right tabular-nums">{fmtPLN(grandActV)}</td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline error (rollback notification) */}
      {inlineError && (
        <p className="text-xs text-destructive px-1">{inlineError}</p>
      )}

      {/* Add line button */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="self-start rounded-md px-4 py-2 font-meta text-xs font-semibold bg-teal/10 text-teal-strong border border-teal/30 hover:bg-teal/20 transition-colors"
      >
        + Dodaj linię
      </button>

      {/* Add line modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-heading font-semibold text-sm mb-4">Nowa linia budżetowa</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Etap / faza
                </label>
                <input
                  type="text"
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value)}
                  placeholder="np. Faza 3 — Konfiguracja"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Typ stawki
                </label>
                <select
                  value={newRateType}
                  onChange={(e) => setNewRateType(e.target.value as RateType)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:border-teal"
                >
                  <option value="K">K — Konsultant</option>
                  <option value="W">W — Warsztat</option>
                  <option value="D">D — Deweloper/Senior</option>
                </select>
              </div>
              <div>
                <label className="font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Estymacja (h)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newEstH}
                  onChange={(e) => setNewEstH(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Opis (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Krótki opis zadania"
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:border-teal"
                />
              </div>
              {addError && (
                <p className="text-xs text-destructive">{addError}</p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleAddLine}
                  disabled={isPending}
                  className="flex-1 bg-teal text-white rounded-md py-2 text-xs font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50"
                >
                  Dodaj
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError('') }}
                  className="flex-1 border border-border rounded-md py-2 text-xs font-semibold hover:bg-muted transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsPanel({
  rateK, setRateK, rateW, setRateW, rateD, setRateD,
  bufferPct, setBufferPct, pmPct, setPmPct,
  budgetMax, setBudgetMax,
  onSave, isPending, error,
}: {
  rateK: string; setRateK: (v: string) => void
  rateW: string; setRateW: (v: string) => void
  rateD: string; setRateD: (v: string) => void
  bufferPct: string; setBufferPct: (v: string) => void
  pmPct: string; setPmPct: (v: string) => void
  budgetMax: string; setBudgetMax: (v: string) => void
  onSave: () => void
  isPending: boolean
  error: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { label: 'Stawka K (zł/h)', val: rateK, set: setRateK, placeholder: '350' },
          { label: 'Stawka W (zł/h)', val: rateW, set: setRateW, placeholder: '750' },
          { label: 'Stawka D (zł/h)', val: rateD, set: setRateD, placeholder: '450' },
          { label: 'Bufor %', val: bufferPct, set: setBufferPct, placeholder: '0' },
          { label: 'PM narzut %', val: pmPct, set: setPmPct, placeholder: '20' },
          { label: 'Budżet max (h)', val: budgetMax, set: setBudgetMax, placeholder: 'opcjonalnie' },
        ] as const).map((f) => (
          <div key={f.label}>
            <label className="font-meta text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              {f.label}
            </label>
            <input
              type="number"
              min="0"
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:border-teal"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className="self-start rounded-md px-4 py-2 font-meta text-xs font-semibold bg-teal text-white hover:bg-teal/90 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
      </button>
    </div>
  )
}

function EmptyBudget({
  onConfigure,
  settingsOpen,
  children,
}: {
  onConfigure: () => void
  settingsOpen: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      {children}
      {!settingsOpen && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-lg">
          <p className="font-heading font-semibold text-sm text-foreground">Brak danych budżetowych</p>
          <p className="font-meta text-xs text-muted-foreground max-w-[42ch]">
            Skonfiguruj stawki i dodaj linie budżetowe lub użyj Claude:
            <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-[11px]">set_budget_settings</code>
          </p>
          <button
            type="button"
            onClick={onConfigure}
            className="mt-2 rounded-full px-4 py-2 font-meta text-xs font-semibold bg-teal/10 text-teal-strong border border-teal/30 hover:bg-teal/20 transition-colors"
          >
            Skonfiguruj stawki
          </button>
        </div>
      )}
    </div>
  )
}

function RateBadge({ type }: { type: RateType }) {
  const cfg = RATE_BADGE[type]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border',
        cfg.cls
      )}
      title={type === 'K' ? 'Konsultant' : type === 'W' ? 'Warsztat' : 'Deweloper/Senior'}
    >
      {cfg.label}
    </span>
  )
}

function EditableActual({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  function commit() {
    const v = parseFloat(draft)
    if (!isNaN(v) && v >= 0) onChange(v)
    else setDraft(String(value))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="number"
        min="0"
        step="0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
        autoFocus
        className="w-16 text-right border border-teal rounded px-1 py-0.5 text-xs bg-[#f0faf7] dark:bg-teal/10 focus:outline-none"
      />
    )
  }

  return (
    <span
      className="cursor-pointer tabular-nums border-b border-dashed border-transparent hover:border-teal transition-colors"
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      title="Kliknij, aby edytować"
    >
      {value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </span>
  )
}

function BurnBar({ pct, actual, est }: { pct: number; actual: number; est: number }) {
  const capped = Math.min(pct, 100)
  return (
    <div className="min-w-[90px]">
      <div className={cn('text-[10px] mb-1', burnColor(pct))}>
        {fmtH(actual)}h / {fmtH(est)}h
      </div>
      <div className="bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={cn('h-1.5 rounded-full transition-all', burnBarColor(pct))}
          style={{ width: `${capped}%` }}
        />
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent: 'teal' | 'amber' | 'red' | 'blue'
  progress?: { value: number; color: string }
  valueClass?: string
}

const ACCENT_BORDER: Record<string, string> = {
  teal: 'border-l-teal',
  amber: 'border-l-[#EF9F27]',
  red: 'border-l-[#E24B4A]',
  blue: 'border-l-[#185FA5]',
}

function KpiCard({ label, value, sub, accent, progress, valueClass }: KpiCardProps) {
  return (
    <div className={cn(
      'bg-background border border-border rounded-lg p-3 border-l-4 relative overflow-hidden',
      ACCENT_BORDER[accent]
    )}>
      <div className="font-meta text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className={cn('font-heading text-xl font-bold text-foreground leading-none', valueClass)}>
        {value}
      </div>
      {progress && (
        <div className="mt-2 bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-1.5 rounded-full transition-all', progress.color)}
            style={{ width: `${Math.min(progress.value, 100)}%` }}
          />
        </div>
      )}
      {sub && (
        <div className="font-meta text-[10px] text-muted-foreground mt-1">{sub}</div>
      )}
    </div>
  )
}
