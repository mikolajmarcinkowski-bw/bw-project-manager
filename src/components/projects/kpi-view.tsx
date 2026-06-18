'use client'

import { useState, useEffect, useTransition, useOptimistic, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Milestone, Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Kpi, KpiStatus, MilestoneStatus } from '@/lib/data/projects'
import {
  addKpi,
  updateKpi,
  deleteKpi,
  updateKpiStatus,
  updateMilestoneStatus,
  type KpiData,
} from '@/lib/actions/documents'

// ─── KPI status helpers ───────────────────────────────────────────────────────

const KPI_STATUS_CLASSES: Record<KpiStatus, string> = {
  on:   'bg-[#E1F5EE] text-[#0F6E56] border border-[#1D9E75]',
  at:   'bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27]',
  off:  'bg-[#FCEBEB] text-[#A32D2D] border border-[#E24B4A]',
  done: 'bg-[#EBF2F9] text-[#185FA5] border border-[#378ADD]',
}

const KPI_STATUS_LABEL: Record<KpiStatus, string> = {
  on:   'Na czasie',
  at:   'Zagrożony',
  off:  'Opóźniony',
  done: 'Ukończony',
}

const KPI_STATUS_CYCLE: KpiStatus[] = ['on', 'at', 'off', 'done']

function nextKpiStatus(current: KpiStatus): KpiStatus {
  const idx = KPI_STATUS_CYCLE.indexOf(current)
  return KPI_STATUS_CYCLE[(idx + 1) % KPI_STATUS_CYCLE.length]
}

// ─── Milestone status helpers ─────────────────────────────────────────────────

const MS_STATUS_CLASSES: Record<MilestoneStatus, string> = {
  on:   'bg-[#E1F5EE] text-[#0F6E56] border border-[#1D9E75]',
  at:   'bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27]',
  off:  'bg-[#FCEBEB] text-[#A32D2D] border border-[#E24B4A]',
  done: 'bg-[#EBF2F9] text-[#185FA5] border border-[#378ADD]',
}

const MS_STATUS_LABEL: Record<MilestoneStatus, string> = {
  on:   'Na czasie',
  at:   'Zagrożony',
  off:  'Opóźniony',
  done: 'Ukończony',
}

const MS_STATUS_CYCLE: MilestoneStatus[] = ['on', 'at', 'off', 'done']

function nextMsStatus(current: MilestoneStatus): MilestoneStatus {
  const idx = MS_STATUS_CYCLE.indexOf(current)
  return MS_STATUS_CYCLE[(idx + 1) % MS_STATUS_CYCLE.length]
}

// ─── KPI status toggle ────────────────────────────────────────────────────────

function KpiStatusToggle({
  kpiId,
  status,
  onToggle,
}: {
  kpiId: string
  status: KpiStatus
  onToggle: (id: string, next: KpiStatus) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_: KpiStatus, next: KpiStatus) => next
  )

  function handleClick() {
    const next = nextKpiStatus(optimisticStatus)
    startTransition(async () => {
      setOptimisticStatus(next)
      const result = await updateKpiStatus(kpiId, next)
      if ('error' in result) {
        console.error('[KpiStatusToggle]', result.error)
      } else {
        onToggle(kpiId, next)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={`Status: ${KPI_STATUS_LABEL[optimisticStatus]}. Kliknij aby zmienić.`}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-semibold font-heading leading-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        KPI_STATUS_CLASSES[optimisticStatus],
        isPending && 'cursor-wait opacity-70'
      )}
    >
      {KPI_STATUS_LABEL[optimisticStatus]}
    </button>
  )
}

// ─── Milestone status toggle ──────────────────────────────────────────────────

function MilestoneStatusToggle({
  milestoneId,
  status,
  onToggle,
}: {
  milestoneId: string
  status: MilestoneStatus
  onToggle: (id: string, next: MilestoneStatus) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_: MilestoneStatus, next: MilestoneStatus) => next
  )

  function handleClick() {
    const next = nextMsStatus(optimisticStatus)
    startTransition(async () => {
      setOptimisticStatus(next)
      const result = await updateMilestoneStatus(milestoneId, next)
      if ('error' in result) {
        console.error('[MilestoneStatusToggle]', result.error)
      } else {
        onToggle(milestoneId, next)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={`Status: ${MS_STATUS_LABEL[optimisticStatus]}. Kliknij aby zmienić.`}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-semibold font-heading leading-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        MS_STATUS_CLASSES[optimisticStatus],
        isPending && 'cursor-wait opacity-70'
      )}
    >
      {MS_STATUS_LABEL[optimisticStatus]}
    </button>
  )
}

// ─── KPI modal ────────────────────────────────────────────────────────────────

interface KpiFormState {
  name: string
  target: string
  status: KpiStatus
  notes: string
}

const DEFAULT_KPI_FORM: KpiFormState = {
  name: '',
  target: '',
  status: 'on',
  notes: '',
}

function kpiToForm(kpi: Kpi): KpiFormState {
  return {
    name: kpi.name,
    target: kpi.target ?? '',
    status: kpi.status,
    notes: kpi.notes ?? '',
  }
}

function KpiModal({
  open,
  onClose,
  projectId,
  editKpi,
  onKpiSaved,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  editKpi: Kpi | null
  onKpiSaved?: (kpi: Kpi) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<KpiFormState>(
    editKpi ? kpiToForm(editKpi) : DEFAULT_KPI_FORM
  )

  function handleChange(field: keyof KpiFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const data: KpiData = {
      name: form.name,
      target: form.target || null,
      status: form.status,
      notes: form.notes || null,
    }

    startTransition(async () => {
      let result
      if (editKpi) {
        result = await updateKpi(editKpi.id, data)
      } else {
        result = await addKpi(projectId, data)
      }

      if ('error' in result) {
        setFormError(result.error)
      } else {
        if (!editKpi && 'id' in result && onKpiSaved) {
          // Optimistic: przekaż nowy KPI do rodzica od razu
          const newId = (result as { ok: true; id: string }).id
          onKpiSaved({
            id: newId,
            name: form.name,
            target: form.target || null,
            status: form.status as KpiStatus,
            notes: form.notes || null,
            actualValue: null,
          })
        }
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editKpi ? 'Edytuj KPI' : 'Dodaj KPI'}</DialogTitle>
        </DialogHeader>

        <form id="kpi-form" onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {/* Nazwa */}
          <div className="flex flex-col gap-1">
            <label htmlFor="kpi-name" className="text-xs font-medium text-foreground">
              Nazwa KPI <span className="text-destructive">*</span>
            </label>
            <input
              id="kpi-name"
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="np. Czas wdrożenia CRM"
              className="h-8 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Target */}
          <div className="flex flex-col gap-1">
            <label htmlFor="kpi-target" className="text-xs font-medium text-foreground">Target</label>
            <input
              id="kpi-target"
              type="text"
              value={form.target}
              onChange={(e) => handleChange('target', e.target.value)}
              placeholder="np. ≤ 12 tygodni"
              className="h-8 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">Status</label>
            <Select
              value={form.status}
              onValueChange={(v) => handleChange('status', v ?? 'on')}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on">Na czasie</SelectItem>
                <SelectItem value="at">Zagrożony</SelectItem>
                <SelectItem value="off">Opóźniony</SelectItem>
                <SelectItem value="done">Ukończony</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Komentarz */}
          <div className="flex flex-col gap-1">
            <label htmlFor="kpi-notes" className="text-xs font-medium text-foreground">Komentarz</label>
            <textarea
              id="kpi-notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Dodatkowe uwagi…"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none placeholder:text-muted-foreground"
            />
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Anuluj
          </Button>
          <Button type="submit" form="kpi-form" size="sm" disabled={isPending}>
            {isPending ? 'Zapisywanie…' : editKpi ? 'Zapisz zmiany' : 'Dodaj KPI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Milestone shape from ProjectDetail ───────────────────────────────────────

export interface MilestoneItem {
  id: string
  msCode: string | null
  name: string
  week: number | null
  status: MilestoneStatus
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

interface KpiViewProps {
  projectId: string
  initialKpis: Kpi[]
  initialMilestones: MilestoneItem[]
}

export function KpiView({ projectId, initialKpis, initialMilestones }: KpiViewProps) {
  const router = useRouter()
  const [kpis, setKpis] = useState<Kpi[]>(initialKpis)
  const [milestones, setMilestones] = useState<MilestoneItem[]>(initialMilestones)
  const [isPending, startTransition] = useTransition()

  // Sync state when server refreshes props (after add/edit via router.refresh())
  useEffect(() => { setKpis(initialKpis) }, [initialKpis])
  useEffect(() => { setMilestones(initialMilestones) }, [initialMilestones])

  // KPI modal
  const [kpiModalOpen, setKpiModalOpen] = useState(false)
  const [editKpi, setEditKpi] = useState<Kpi | null>(null)

  // KPI delete
  const [deleteKpiId, setDeleteKpiId] = useState<string | null>(null)
  const [deleteKpiError, setDeleteKpiError] = useState<string | null>(null)

  function openAddKpi() {
    setEditKpi(null)
    setKpiModalOpen(true)
  }

  function openEditKpi(kpi: Kpi) {
    setEditKpi(kpi)
    setKpiModalOpen(true)
  }

  function closeKpiModal() {
    setKpiModalOpen(false)
    setEditKpi(null)
    router.refresh()
  }

  function handleKpiSaved(kpi: Kpi) {
    setKpis((prev) => [kpi, ...prev])
  }

  const handleKpiStatusToggle = useCallback((id: string, next: KpiStatus) => {
    setKpis((prev) => prev.map((k) => k.id === id ? { ...k, status: next } : k))
  }, [])

  const handleMilestoneStatusToggle = useCallback((id: string, next: MilestoneStatus) => {
    setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, status: next } : m))
  }, [])

  function handleDeleteKpiConfirm(kpiId: string) {
    setDeleteKpiId(kpiId)
    setDeleteKpiError(null)
  }

  function handleDeleteKpiCancel() {
    setDeleteKpiId(null)
    setDeleteKpiError(null)
  }

  function handleDeleteKpiExecute() {
    if (!deleteKpiId) return
    startTransition(async () => {
      const result = await deleteKpi(deleteKpiId)
      if ('error' in result) {
        setDeleteKpiError(result.error)
      } else {
        setKpis((prev) => prev.filter((k) => k.id !== deleteKpiId))
        setDeleteKpiId(null)
        router.refresh()
      }
    })
  }

  // Stats
  const countOn = kpis.filter((k) => k.status === 'on').length
  const countAt = kpis.filter((k) => k.status === 'at').length
  const countOff = kpis.filter((k) => k.status === 'off').length
  const countDone = kpis.filter((k) => k.status === 'done').length

  return (
    <div className="flex flex-col gap-8">
      {/* ── KPI Section ── */}
      <section aria-label="Wskaźniki KPI">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-base text-foreground">
            Wskaźniki KPI
          </h2>
          <Button size="sm" onClick={openAddKpi} className="gap-1.5">
            <Plus className="size-3.5" aria-hidden="true" />
            Dodaj KPI
          </Button>
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-xs mb-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#1D9E75]" aria-hidden="true" />
            <span className="text-muted-foreground">Na czasie: <strong className="text-foreground">{countOn}</strong></span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#EF9F27]" aria-hidden="true" />
            <span className="text-muted-foreground">Zagrożone: <strong className="text-foreground">{countAt}</strong></span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#E24B4A]" aria-hidden="true" />
            <span className="text-muted-foreground">Opóźnione: <strong className="text-foreground">{countOff}</strong></span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#378ADD]" aria-hidden="true" />
            <span className="text-muted-foreground">Ukończone: <strong className="text-foreground">{countDone}</strong></span>
          </span>
        </div>

        {/* KPI grid or empty state */}
        {kpis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-dashed border-border">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
            <p className="font-heading font-semibold text-sm text-foreground">Brak wskaźników KPI</p>
            <p className="font-meta text-xs text-muted-foreground max-w-[32ch]">
              Dodaj ręcznie lub przez Claude: add_kpi
            </p>
            <Button size="sm" onClick={openAddKpi} variant="outline" className="gap-1.5">
              <Plus className="size-3.5" aria-hidden="true" />
              Dodaj pierwszy KPI
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                kpi={kpi}
                onEdit={openEditKpi}
                onDelete={handleDeleteKpiConfirm}
                onStatusToggle={handleKpiStatusToggle}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Milestone Tracker ── */}
      <section aria-label="Kamienie milowe">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-heading font-semibold text-base text-foreground">Kamienie milowe</h2>
          <div className="flex-1 h-px bg-border" aria-hidden="true" />
        </div>

        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center rounded-xl border border-dashed border-border">
            <Milestone className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
            <p className="font-heading font-semibold text-sm text-foreground">Brak kamieni milowych</p>
            <p className="font-meta text-xs text-muted-foreground max-w-[32ch]">
              Kamienie milowe są tworzone przez Claude: add_milestone
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[200px]">Kamień milowy</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Tydzień</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((ms, idx) => (
                  <tr
                    key={ms.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {ms.msCode && (
                          <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-semibold text-muted-foreground font-heading">
                            {ms.msCode}
                          </span>
                        )}
                        <span className="font-medium text-foreground">{ms.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {ms.week !== null ? `T${ms.week}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <MilestoneStatusToggle
                        milestoneId={ms.id}
                        status={ms.status}
                        onToggle={handleMilestoneStatusToggle}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* KPI Modal */}
      {kpiModalOpen && (
        <KpiModal
          open={kpiModalOpen}
          onClose={closeKpiModal}
          projectId={projectId}
          editKpi={editKpi}
          onKpiSaved={editKpi ? undefined : handleKpiSaved}
        />
      )}

      {/* KPI Delete confirm */}
      <Dialog open={deleteKpiId !== null} onOpenChange={(o) => !o && handleDeleteKpiCancel()}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Usuń KPI</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć ten wskaźnik KPI? Tej operacji nie można cofnąć.
          </p>
          {deleteKpiError && <p className="text-xs text-destructive">{deleteKpiError}</p>}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleDeleteKpiCancel} disabled={isPending}>
              Anuluj
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteKpiExecute} disabled={isPending}>
              {isPending ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  kpi,
  onEdit,
  onDelete,
  onStatusToggle,
}: {
  kpi: Kpi
  onEdit: (kpi: Kpi) => void
  onDelete: (id: string) => void
  onStatusToggle: (id: string, next: KpiStatus) => void
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-3 bg-card transition-shadow hover:shadow-sm',
      kpi.status === 'on' ? 'border-[#1D9E75]/30' :
      kpi.status === 'at' ? 'border-[#EF9F27]/30' :
      kpi.status === 'off' ? 'border-[#E24B4A]/30' :
      'border-[#378ADD]/30'
    )}>
      {/* Status + actions */}
      <div className="flex items-start justify-between gap-2">
        <KpiStatusToggle
          kpiId={kpi.id}
          status={kpi.status}
          onToggle={onStatusToggle}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(kpi)}
            aria-label="Edytuj KPI"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(kpi.id)}
            aria-label="Usuń KPI"
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Nazwa */}
      <p className="font-heading font-semibold text-sm text-foreground leading-snug">
        {kpi.name}
      </p>

      {/* Target */}
      {kpi.target && (
        <p className="font-meta text-xs text-muted-foreground">
          Target: {kpi.target}
        </p>
      )}

      {/* Notes */}
      {kpi.notes && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">
          {kpi.notes}
        </p>
      )}
    </div>
  )
}
