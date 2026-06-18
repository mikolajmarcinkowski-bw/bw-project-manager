'use client'

import { useState, useEffect, useTransition, useOptimistic, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Pencil, Trash2, Plus, Search } from 'lucide-react'
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
import type { Risk, RagValue, RiskStatus } from '@/lib/data/projects'
import {
  addRisk,
  updateRisk,
  deleteRisk,
  updateRiskStatus,
  type RiskData,
} from '@/lib/actions/documents'

// ─── RAG helpers ──────────────────────────────────────────────────────────────

const RAG_CLASSES: Record<RagValue, string> = {
  R: 'bg-[#FCEBEB] text-[#A32D2D] border border-[#E24B4A]',
  A: 'bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27]',
  G: 'bg-[#E1F5EE] text-[#0F6E56] border border-[#1D9E75]',
}


const RAG_LABEL: Record<RagValue, string> = {
  R: 'Czerwony',
  A: 'Pomarańczowy',
  G: 'Zielony',
}

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  open: 'Otwarte',
  monitor: 'Monitorowane',
  closed: 'Zamknięte',
}

const RISK_STATUS_CLASSES: Record<RiskStatus, string> = {
  open: 'bg-[#FCEBEB] text-[#A32D2D] border border-[#E24B4A]',
  monitor: 'bg-[#FAEEDA] text-[#854F0B] border border-[#EF9F27]',
  closed: 'bg-[#E1F5EE] text-[#0F6E56] border border-[#1D9E75]',
}

const STATUS_CYCLE: RiskStatus[] = ['open', 'monitor', 'closed']

function nextStatus(current: RiskStatus): RiskStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function calcRag(probability: number, impact: number): RagValue {
  const score = probability * impact
  if (score >= 15) return 'R'
  if (score >= 6) return 'A'
  return 'G'
}

const PROB_LABELS: Record<number, string> = {
  1: '1 – Bardzo mało prawdopodobne',
  2: '2 – Mało prawdopodobne',
  3: '3 – Możliwe',
  4: '4 – Prawdopodobne',
  5: '5 – Bardzo prawdopodobne',
}

const IMPACT_LABELS: Record<number, string> = {
  1: '1 – Pomijalny',
  2: '2 – Niski',
  3: '3 – Średni',
  4: '4 – Wysoki',
  5: '5 – Krytyczny',
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'CRM', label: 'CRM' },
  { value: 'SPO', label: 'SPO' },
  { value: 'INT', label: 'INT' },
  { value: 'MKT', label: 'MKT' },
  { value: 'ERP', label: 'ERP' },
]

// ─── Status toggle pill ───────────────────────────────────────────────────────

function RiskStatusToggle({
  riskId,
  status,
  onToggle,
}: {
  riskId: string
  status: RiskStatus
  onToggle: (id: string, next: RiskStatus) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_: RiskStatus, next: RiskStatus) => next
  )

  function handleClick() {
    const next = nextStatus(optimisticStatus)
    startTransition(async () => {
      setOptimisticStatus(next)
      const result = await updateRiskStatus(riskId, next)
      if ('error' in result) {
        console.error('[RiskStatusToggle]', result.error)
      } else {
        onToggle(riskId, next)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={`Status: ${RISK_STATUS_LABEL[optimisticStatus]}. Kliknij aby zmienić.`}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold font-heading leading-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        RISK_STATUS_CLASSES[optimisticStatus],
        isPending && 'cursor-wait opacity-70'
      )}
    >
      {RISK_STATUS_LABEL[optimisticStatus]}
    </button>
  )
}

// ─── Modal dodaj/edytuj ───────────────────────────────────────────────────────

interface RiskFormState {
  description: string
  category: string
  phase: string
  probability: number
  impact: number
  owner: string
  mitigation: string
  status: RiskStatus
}

const DEFAULT_FORM: RiskFormState = {
  description: '',
  category: '',
  phase: '',
  probability: 3,
  impact: 3,
  owner: '',
  mitigation: '',
  status: 'open',
}

function riskToForm(risk: Risk): RiskFormState {
  return {
    description: risk.description,
    category: risk.category ?? '',
    phase: risk.phase ?? '',
    probability: risk.probability ?? 3,
    impact: risk.impact ?? 3,
    owner: risk.owner ?? '',
    mitigation: risk.mitigation ?? '',
    status: risk.status,
  }
}

// ─── RAG badge ────────────────────────────────────────────────────────────────

function RagBadge({ rag }: { rag: RagValue | null }) {
  if (!rag) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold font-heading', RAG_CLASSES[rag])}>
      {rag}
    </span>
  )
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

interface RaidViewProps {
  projectId: string
  initialRisks: Risk[]
  onEscalateRisk?: (risk: Risk) => void
}

export function RaidView({ projectId, initialRisks, onEscalateRisk }: RaidViewProps) {
  const router = useRouter()
  const [risks, setRisks] = useState<Risk[]>(initialRisks)
  const [isPending, startTransition] = useTransition()

  // Sync state when server refreshes initialRisks (after add/edit via router.refresh())
  useEffect(() => { setRisks(initialRisks) }, [initialRisks])

  // Filtry
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterRag, setFilterRag] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editRisk, setEditRisk] = useState<Risk | null>(null)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openAdd() {
    setEditRisk(null)
    setModalOpen(true)
  }

  function openEdit(risk: Risk) {
    setEditRisk(risk)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditRisk(null)
    // Refresh from server
    router.refresh()
  }

  const handleStatusToggle = useCallback((id: string, next: RiskStatus) => {
    setRisks((prev) => prev.map((r) => r.id === id ? { ...r, status: next } : r))
  }, [])

  function handleDeleteConfirm(riskId: string) {
    setDeleteId(riskId)
    setDeleteError(null)
  }

  function handleDeleteCancel() {
    setDeleteId(null)
    setDeleteError(null)
  }

  function handleDeleteExecute() {
    if (!deleteId) return
    startTransition(async () => {
      const result = await deleteRisk(deleteId)
      if ('error' in result) {
        setDeleteError(result.error)
      } else {
        setRisks((prev) => prev.filter((r) => r.id !== deleteId))
        setDeleteId(null)
        router.refresh()
      }
    })
  }

  // Filtrowanie
  const filtered = risks.filter((r) => {
    if (filterCategory !== 'all' && r.category !== filterCategory) return false
    if (filterRag !== 'all' && r.rag !== filterRag) return false
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.description.toLowerCase().includes(q) && !(r.owner ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  // Stats
  const countR = risks.filter((r) => r.rag === 'R').length
  const countA = risks.filter((r) => r.rag === 'A').length
  const countG = risks.filter((r) => r.rag === 'G').length
  const countOpen = risks.filter((r) => r.status === 'open').length
  const countMonitor = risks.filter((r) => r.status === 'monitor').length
  const countClosed = risks.filter((r) => r.status === 'closed').length

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base text-foreground">RAID Log</h2>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          Dodaj ryzyko
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterCategory(opt.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium font-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filterCategory === opt.value
                  ? 'bg-teal/10 text-teal border border-teal/30'
                  : 'text-muted-foreground hover:bg-muted border border-transparent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* RAG filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">RAG:</span>
          {(['all', 'R', 'A', 'G'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilterRag(v)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.65rem] font-bold font-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filterRag === v
                  ? v === 'all'
                    ? 'bg-muted text-foreground border border-border'
                    : cn(RAG_CLASSES[v as RagValue])
                  : 'text-muted-foreground/60 hover:text-muted-foreground border border-transparent'
              )}
            >
              {v === 'all' ? 'Wszystkie' : v}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Status:</span>
          {([
            { value: 'all', label: 'Wszystkie' },
            { value: 'open', label: 'Otwarte' },
            { value: 'monitor', label: 'Monitorowane' },
            { value: 'closed', label: 'Zamknięte' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.65rem] font-medium font-heading transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filterStatus === opt.value
                  ? 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground/60 hover:text-muted-foreground border border-transparent'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj w opisie…"
            className="h-7 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[#E24B4A]" aria-hidden="true" />
          <span className="text-muted-foreground">R: <strong className="text-foreground">{countR}</strong></span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[#EF9F27]" aria-hidden="true" />
          <span className="text-muted-foreground">A: <strong className="text-foreground">{countA}</strong></span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-[#1D9E75]" aria-hidden="true" />
          <span className="text-muted-foreground">G: <strong className="text-foreground">{countG}</strong></span>
        </span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-muted-foreground">Otwarte: <strong className="text-foreground">{countOpen}</strong></span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-muted-foreground">Monitorowane: <strong className="text-foreground">{countMonitor}</strong></span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-muted-foreground">Zamknięte: <strong className="text-foreground">{countClosed}</strong></span>
      </div>

      {/* Table or empty state */}
      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
          <p className="font-heading font-semibold text-sm text-foreground">Brak ryzyk</p>
          <p className="font-meta text-xs text-muted-foreground max-w-[32ch]">
            Dodaj ręcznie lub przez Claude: add_risk
          </p>
          <Button size="sm" onClick={openAdd} variant="outline" className="gap-1.5">
            <Plus className="size-3.5" aria-hidden="true" />
            Dodaj pierwsze ryzyko
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <p className="font-meta text-xs text-muted-foreground">Brak ryzyk pasujących do filtrów.</p>
          <button
            type="button"
            onClick={() => { setFilterCategory('all'); setFilterRag('all'); setFilterStatus('all'); setSearch('') }}
            className="text-xs text-teal hover:underline"
          >
            Wyczyść filtry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[200px]">Ryzyko</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Kat.</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Faza</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground">P</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground">W</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground">P×W</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground">RAG</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Właściciel</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[160px]">Mitigacja</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((risk, idx) => (
                <tr
                  key={risk.id}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground max-w-[280px]">
                    <span className="line-clamp-2">{risk.description}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{risk.category ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{risk.phase ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-foreground">{risk.probability ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center text-foreground">{risk.impact ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center font-semibold text-foreground">{risk.score ?? '—'}</td>
                  <td className="px-2 py-2.5 text-center">
                    <RagBadge rag={risk.rag} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{risk.owner ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[200px]">
                    <span className="line-clamp-2">{risk.mitigation ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RiskStatusToggle
                      riskId={risk.id}
                      status={risk.status}
                      onToggle={handleStatusToggle}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {onEscalateRisk && (risk.status === 'open' || risk.status === 'monitor') && (
                        <button
                          type="button"
                          onClick={() => onEscalateRisk(risk)}
                          className="text-[0.6rem] font-meta text-muted-foreground hover:text-orange-600 transition-colors px-1.5 py-0.5 rounded hover:bg-orange-50 dark:hover:bg-orange-950/20"
                          title="Eskaluj do Change Request"
                        >
                          ↑ CR
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(risk)}
                        aria-label="Edytuj ryzyko"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConfirm(risk.id)}
                        aria-label="Usuń ryzyko"
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <RaidModalWrapper
          open={modalOpen}
          onClose={closeModal}
          projectId={projectId}
          editRisk={editRisk}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && handleDeleteCancel()}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Usuń ryzyko</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz usunąć to ryzyko? Tej operacji nie można cofnąć.
          </p>
          {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleDeleteCancel} disabled={isPending}>
              Anuluj
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteExecute} disabled={isPending}>
              {isPending ? 'Usuwanie…' : 'Usuń'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrapper keeps form state fresh on open/close
function RaidModalWrapper({
  open,
  onClose,
  projectId,
  editRisk,
}: {
  open: boolean
  onClose: () => void
  projectId: string
  editRisk: Risk | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<RiskFormState>(
    editRisk ? riskToForm(editRisk) : DEFAULT_FORM
  )

  const previewRag = calcRag(form.probability, form.impact)

  function handleChange(field: keyof RiskFormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const data: RiskData = {
      description: form.description,
      category: form.category || null,
      phase: form.phase || null,
      probability: form.probability,
      impact: form.impact,
      owner: form.owner,
      mitigation: form.mitigation || null,
      status: form.status,
    }

    startTransition(async () => {
      let result
      if (editRisk) {
        result = await updateRisk(editRisk.id, data)
      } else {
        result = await addRisk(projectId, data)
      }

      if ('error' in result) {
        setFormError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editRisk ? 'Edytuj ryzyko' : 'Dodaj ryzyko'}</DialogTitle>
        </DialogHeader>

        <form id="risk-form" onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
          {/* Opis */}
          <div className="flex flex-col gap-1">
            <label htmlFor="risk-desc" className="text-xs font-medium text-foreground">
              Opis <span className="text-destructive">*</span>
            </label>
            <textarea
              id="risk-desc"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
              rows={3}
              placeholder="Opisz ryzyko…"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Kategoria + Faza */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">Kategoria</label>
              <Select
                value={form.category || ''}
                onValueChange={(v) => handleChange('category', v ?? '')}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Wybierz…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.slice(1).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="risk-phase" className="text-xs font-medium text-foreground">Faza</label>
              <input
                id="risk-phase"
                type="text"
                value={form.phase}
                onChange={(e) => handleChange('phase', e.target.value)}
                placeholder="np. Wdrożenie"
                className="h-7 rounded-[min(var(--radius-md),10px)] border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* P + W */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Prawdopodobieństwo (P) <span className="text-destructive">*</span>
              </label>
              <select
                value={String(form.probability)}
                onChange={(e) => handleChange('probability', Number(e.target.value))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 font-meta text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>{PROB_LABELS[n]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                Wpływ (W) <span className="text-destructive">*</span>
              </label>
              <select
                value={String(form.impact)}
                onChange={(e) => handleChange('impact', Number(e.target.value))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 font-meta text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>{IMPACT_LABELS[n]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* RAG preview */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">P×W = {form.probability * form.impact}</span>
            <span className="mx-1 text-muted-foreground/50">·</span>
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold font-heading', RAG_CLASSES[previewRag])}>
              {previewRag}
            </span>
            <span className="text-xs text-muted-foreground">— {RAG_LABEL[previewRag]}</span>
          </div>

          {/* Właściciel */}
          <div className="flex flex-col gap-1">
            <label htmlFor="risk-owner" className="text-xs font-medium text-foreground">
              Właściciel <span className="text-destructive">*</span>
            </label>
            <input
              id="risk-owner"
              type="text"
              value={form.owner}
              onChange={(e) => handleChange('owner', e.target.value)}
              required
              placeholder="Imię i nazwisko"
              className="h-8 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Mitigacja */}
          <div className="flex flex-col gap-1">
            <label htmlFor="risk-mitigation" className="text-xs font-medium text-foreground">Plan mitigacji</label>
            <textarea
              id="risk-mitigation"
              value={form.mitigation}
              onChange={(e) => handleChange('mitigation', e.target.value)}
              rows={2}
              placeholder="Jak zminimalizować ryzyko?"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value as RiskStatus)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 font-meta text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="open">Otwarte</option>
              <option value="monitor">Monitorowane</option>
              <option value="closed">Zamknięte</option>
            </select>
          </div>

          {formError && (
            <p className="text-xs text-destructive">{formError}</p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            form="risk-form"
            size="sm"
            disabled={isPending}
          >
            {isPending ? 'Zapisywanie…' : editRisk ? 'Zapisz zmiany' : 'Dodaj ryzyko'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
