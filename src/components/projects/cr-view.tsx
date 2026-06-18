'use client'

import { useState, useTransition, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ChangeRequest, CrType, CrImpact, CrStatus, ApprovalStatus, Risk } from '@/lib/data/projects'
import {
  addChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,
  approveCr,
} from '@/lib/actions/documents'

interface CrViewProps {
  projectId: string
  initialCrs: ChangeRequest[]
  initialRiskForCr?: Risk | null
  onRiskCrHandled?: () => void
}

const STATUS_BADGE: Record<CrStatus, { label: string; cls: string }> = {
  draft: { label: 'Szkic', cls: 'bg-muted text-muted-foreground border-border' },
  pending: { label: 'Oczekuje', cls: 'bg-[#FAEEDA] text-[#854F0B] border-[#EF9F27]' },
  approved: { label: 'Zatwierdzone', cls: 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]' },
  rejected: { label: 'Odrzucone', cls: 'bg-[#FCEBEB] text-[#A32D2D] border-[#E24B4A]' },
  implemented: { label: 'Wdrożone', cls: 'bg-[#EBF2F9] text-[#185FA5] border-[#378ADD]' },
}

const IMPACT_BADGE: Record<CrImpact, { label: string; cls: string }> = {
  low: { label: 'Niski', cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
  medium: { label: 'Średni', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  high: { label: 'Wysoki', cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
}

const CR_TYPE_LABELS: Record<CrType, string> = {
  scope: 'Zakres',
  timeline: 'Harmonogram',
  budget: 'Budżet',
  arch: 'Architektura',
  resource: 'Zasoby',
  other: 'Inne',
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return d
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyCrState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-lg">
      <p className="font-heading font-semibold text-sm text-foreground">Brak Change Requestów</p>
      <p className="font-meta text-xs text-muted-foreground max-w-[42ch]">
        Dodaj pierwszy CR ręcznie lub użyj Claude:
        <code className="ml-1 bg-muted px-1.5 py-0.5 rounded text-[11px]">add_change_request</code>
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-full px-4 py-2 font-meta text-xs font-semibold bg-[#F94213] text-white hover:bg-[#d93410] transition-colors"
      >
        + Nowy CR
      </button>
    </div>
  )
}

// ─── CR Form (Dialog) ─────────────────────────────────────────────────────────

interface CrFormData {
  cr_number: string
  title: string
  cr_type: CrType
  submitted_date: string
  current_state: string
  desired_state: string
  business_rationale: string
  impact_level: CrImpact | ''
  impact_hours: string
  impact_cost: string
  implementation_plan: string
  notes: string
  status: CrStatus
  risk_id: string | null
}

function defaultForm(existingCrCount: number): CrFormData {
  const num = String(existingCrCount + 1).padStart(3, '0')
  return {
    cr_number: `CR-${num}`,
    title: '',
    cr_type: 'scope',
    submitted_date: new Date().toISOString().slice(0, 10),
    current_state: '',
    desired_state: '',
    business_rationale: '',
    impact_level: '',
    impact_hours: '',
    impact_cost: '',
    implementation_plan: '',
    notes: '',
    status: 'draft',
    risk_id: null,
  }
}

function CrFormDialog({
  onClose,
  onSave,
  initial,
  crId,
  initialApprovals,
  onApprovalChanged,
  isPending,
  error,
  existingCount,
}: {
  onClose: () => void
  onSave: (data: CrFormData) => void
  initial?: CrFormData
  crId?: string
  initialApprovals?: { bwApproval: ApprovalStatus | null; clientApproval: ApprovalStatus | null }
  onApprovalChanged?: (side: 'bw' | 'client', status: ApprovalStatus) => void
  isPending: boolean
  error: string
  existingCount: number
}) {
  const [form, setForm] = useState<CrFormData>(initial ?? defaultForm(existingCount))

  function set<K extends keyof CrFormData>(key: K, value: CrFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const TYPES: { value: CrType; label: string }[] = [
    { value: 'scope', label: 'Zmiana zakresu' },
    { value: 'timeline', label: 'Zmiana harmonogramu' },
    { value: 'budget', label: 'Zmiana budżetu' },
    { value: 'arch', label: 'Zmiana architektoniczna' },
    { value: 'resource', label: 'Zmiana zasobów' },
    { value: 'other', label: 'Inne' },
  ]

  const IMPACTS: { value: CrImpact; label: string; sub: string }[] = [
    { value: 'low', label: 'Niski', sub: 'Minimalna zmiana' },
    { value: 'medium', label: 'Średni', sub: 'Dodatkowe godziny' },
    { value: 'high', label: 'Wysoki', sub: 'Wpływ na zakres/budżet' },
  ]

  const estCost =
    form.impact_hours && form.impact_cost
      ? (parseFloat(form.impact_hours) || 0) * (parseFloat(form.impact_cost) || 0)
      : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 overflow-y-auto py-6 px-4">
      <div className="bg-background border border-border rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-heading font-bold text-base">
            {crId ? `Edytuj CR ${form.cr_number}` : 'Nowy CR'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Sekcja 1: Identyfikacja */}
          <section>
            <h3 className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-teal pb-1.5 mb-3">
              1. Identyfikacja
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Nr CR</label>
                <input
                  type="text"
                  value={form.cr_number}
                  onChange={(e) => set('cr_number', e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Data zgłoszenia</label>
                <input
                  type="date"
                  value={form.submitted_date}
                  onChange={(e) => set('submitted_date', e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tytuł zmiany <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Krótki, jednoznaczny tytuł CR"
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as CrStatus)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                >
                  {(Object.keys(STATUS_BADGE) as CrStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_BADGE[s].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.risk_id && (
              <div className="mt-3 text-[0.7rem] font-meta text-muted-foreground bg-[#FAEEDA]/50 border border-[#EF9F27]/30 rounded-md px-3 py-2">
                Powiazane ryzyko: {form.current_state?.slice(0, 80) || form.risk_id}
              </div>
            )}

            <div className="mt-3">
              <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Typ zmiany</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('cr_type', t.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 font-meta text-xs font-bold border transition-colors',
                      form.cr_type === t.value
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-background text-muted-foreground border-border hover:border-teal hover:text-teal'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Sekcja 2: Opis */}
          <section>
            <h3 className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-teal pb-1.5 mb-3">
              2. Opis Zmiany
            </h3>
            <div className="flex flex-col gap-3">
              {([
                { key: 'current_state' as const, label: 'Aktualny stan' },
                { key: 'desired_state' as const, label: 'Żądana zmiana' },
                { key: 'business_rationale' as const, label: 'Uzasadnienie biznesowe' },
              ]).map((f) => (
                <div key={f.key}>
                  <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{f.label}</label>
                  <textarea
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={3}
                    className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal resize-y min-h-[60px]"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Sekcja 3: Analiza wpływu */}
          <section>
            <h3 className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-teal pb-1.5 mb-3">
              3. Analiza Wpływu
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {IMPACTS.map((imp) => (
                <button
                  key={imp.value}
                  type="button"
                  onClick={() => set('impact_level', imp.value)}
                  className={cn(
                    'border rounded-lg p-3 text-center cursor-pointer transition-all',
                    form.impact_level === imp.value && imp.value === 'low'
                      ? 'border-[#1D9E75] bg-[#f0fdf4]'
                      : form.impact_level === imp.value && imp.value === 'medium'
                        ? 'border-[#EF9F27] bg-[#fffbf0]'
                        : form.impact_level === imp.value && imp.value === 'high'
                          ? 'border-[#E24B4A] bg-[#fff5f5]'
                          : 'border-border hover:border-teal'
                  )}
                >
                  <div className={cn(
                    'text-base mb-1',
                    imp.value === 'low' ? 'text-[#1D9E75]'
                    : imp.value === 'medium' ? 'text-[#EF9F27]'
                    : 'text-[#E24B4A]'
                  )}>
                    {imp.value === 'low' ? '↓' : imp.value === 'medium' ? '→' : '↑'}
                  </div>
                  <div className="font-meta text-xs font-bold">{imp.label}</div>
                  <div className="font-meta text-[10px] text-muted-foreground mt-0.5">{imp.sub}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Godziny BW (h)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.impact_hours}
                  onChange={(e) => set('impact_hours', e.target.value)}
                  placeholder="0"
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Stawka (zł/h)</label>
                <input
                  type="number"
                  min="0"
                  value={form.impact_cost}
                  onChange={(e) => set('impact_cost', e.target.value)}
                  placeholder="350"
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal"
                />
              </div>
              {estCost !== null && estCost > 0 && (
                <div className="col-span-2">
                  <p className="font-meta text-xs text-[#0F6E56] font-semibold">
                    Koszt wyliczony: {estCost.toLocaleString('pl-PL')} PLN
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Sekcja 4: Plan wdrożenia */}
          <section>
            <h3 className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-teal pb-1.5 mb-3">
              4. Plan Wdrożenia
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Plan działań</label>
                <textarea
                  value={form.implementation_plan}
                  onChange={(e) => set('implementation_plan', e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal resize-y min-h-[60px]"
                />
              </div>
              <div>
                <label className="block font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notatki</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-background focus:outline-none focus:border-teal resize-y min-h-[50px]"
                />
              </div>
            </div>
          </section>

          {/* Sekcja 5: Zatwierdzenia — widoczna tylko przy edycji istniejącego CR */}
          {crId && onApprovalChanged && (
            <section>
              <h3 className="font-meta text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b-2 border-teal pb-1.5 mb-3">
                5. Zatwierdzenia
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* BW PM */}
                <ApprovalBox
                  label="BusinessWeb — Project Manager"
                  current={initialApprovals?.bwApproval ?? null}
                  onDecision={(s) => onApprovalChanged('bw', s)}
                  isPending={isPending}
                />
                {/* Klient Sponsor */}
                <ApprovalBox
                  label="Klient — Sponsor / PM Klienta"
                  current={initialApprovals?.clientApproval ?? null}
                  onDecision={(s) => onApprovalChanged('client', s)}
                  isPending={isPending}
                />
              </div>
              <p className="mt-3 px-3 py-2 bg-muted/30 border-l-4 border-teal text-[11px] text-muted-foreground leading-snug rounded-r">
                CR jest ważny dopiero po akceptacji obu stron.
              </p>
            </section>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={isPending}
              className="flex-1 bg-teal text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Zapisywanie…' : 'Zapisz do rejestru'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ApprovalBox sub-component ───────────────────────────────────────────────

function ApprovalBox({
  label,
  current,
  onDecision,
  isPending,
}: {
  label: string
  current: ApprovalStatus | null
  onDecision: (status: ApprovalStatus) => void
  isPending: boolean
}) {
  const boxCls =
    current === 'approved'
      ? 'border-[#1D9E75] bg-[#f0fdf4]'
      : current === 'rejected'
        ? 'border-[#E24B4A] bg-[#fff5f5]'
        : 'border-[#EF9F27] bg-[#fffbf0]'

  return (
    <div className={cn('border rounded-lg p-3', boxCls)}>
      <p className="font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      {current && (
        <p className={cn(
          'font-meta text-xs font-semibold mb-2',
          current === 'approved' ? 'text-[#0F6E56]' : current === 'rejected' ? 'text-[#A32D2D]' : 'text-[#854F0B]'
        )}>
          {current === 'approved' ? '✓ Zatwierdzono' : current === 'rejected' ? '✕ Odrzucono' : '⋯ Oczekuje'}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDecision('approved')}
          className={cn(
            'rounded-full px-3 py-1 font-meta text-[10px] font-bold border transition-colors',
            current === 'approved'
              ? 'bg-[#E1F5EE] text-[#0F6E56] border-[#1D9E75]'
              : 'bg-background text-muted-foreground border-border hover:border-[#1D9E75] hover:text-[#0F6E56]'
          )}
        >
          Zatwierdzam ✓
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDecision('rejected')}
          className={cn(
            'rounded-full px-3 py-1 font-meta text-[10px] font-bold border transition-colors',
            current === 'rejected'
              ? 'bg-[#FCEBEB] text-[#A32D2D] border-[#E24B4A]'
              : 'bg-background text-muted-foreground border-border hover:border-[#E24B4A] hover:text-[#A32D2D]'
          )}
        >
          Odrzucam ✗
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDecision('pending')}
          className="ml-auto rounded-full px-3 py-1 font-meta text-[10px] font-bold border border-border text-muted-foreground hover:bg-muted transition-colors"
        >
          Oczekuje
        </button>
      </div>
    </div>
  )
}

// ─── Main CrView ──────────────────────────────────────────────────────────────

export function CrView({ projectId, initialCrs, initialRiskForCr, onRiskCrHandled }: CrViewProps) {
  const [crs, setCrs] = useState<ChangeRequest[]>(initialCrs)
  const [showForm, setShowForm] = useState(false)
  const [editCr, setEditCr] = useState<ChangeRequest | null>(null)
  const [prefillForm, setPrefillForm] = useState<CrFormData | null>(null)
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()

  // Obsługa eskalacji ryzyka do CR — pre-wypełnienie formularza
  useEffect(() => {
    if (initialRiskForCr) {
      const num = String(crs.length + 1).padStart(3, '0')
      const prefilled: CrFormData = {
        cr_number: `CR-${num}`,
        title: `CR: ${initialRiskForCr.description.slice(0, 80)}`,
        cr_type: 'scope',
        submitted_date: new Date().toISOString().slice(0, 10),
        current_state: initialRiskForCr.description,
        desired_state: '',
        business_rationale: '',
        impact_level: initialRiskForCr.rag === 'R' ? 'high' : initialRiskForCr.rag === 'A' ? 'medium' : 'low',
        impact_hours: '',
        impact_cost: '',
        implementation_plan: '',
        notes: '',
        status: 'draft',
        risk_id: initialRiskForCr.id,
      }
      setPrefillForm(prefilled)
      setEditCr(null)
      setFormError('')
      setShowForm(true)
      onRiskCrHandled?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRiskForCr])

  const totalHours = crs.reduce((s, c) => s + (c.impactHours ?? 0), 0)
  const totalCost = crs.reduce((s, c) => s + (c.impactCost ?? 0), 0)
  const approvedCount = crs.filter((c) => c.status === 'approved' || c.status === 'implemented').length
  const rejectedCount = crs.filter((c) => c.status === 'rejected').length

  function handleSave(form: CrFormData) {
    if (!form.title.trim()) {
      setFormError('Tytuł jest wymagany.')
      return
    }
    setFormError('')

    const hours = parseFloat(form.impact_hours) || undefined
    const rateVal = parseFloat(form.impact_cost) || undefined
    const costCalc = hours && rateVal ? hours * rateVal : undefined

    startTransition(async () => {
      if (editCr) {
        // Nie wysyłamy 'approved'/'rejected' przez updateChangeRequest — te statusy
        // wymagają approveCr (dual-approval). Pozostałe pola zapisujemy normalnie.
        const statusToSend: CrStatus | undefined =
          form.status === 'approved' || form.status === 'rejected'
            ? undefined
            : form.status
        const res = await updateChangeRequest(editCr.id, {
          title: form.title,
          cr_number: form.cr_number,
          cr_type: form.cr_type,
          current_state: form.current_state || undefined,
          desired_state: form.desired_state || undefined,
          business_rationale: form.business_rationale || undefined,
          impact_level: form.impact_level || undefined,
          impact_hours: hours,
          impact_cost: costCalc,
          implementation_plan: form.implementation_plan || undefined,
          notes: form.notes || undefined,
          submitted_date: form.submitted_date || undefined,
          status: statusToSend,
        })
        if ('error' in res) { setFormError(res.error); return }
        setCrs((prev) =>
          prev.map((c) =>
            c.id === editCr.id
              ? {
                  ...c,
                  title: form.title,
                  crNumber: form.cr_number,
                  crType: form.cr_type,
                  currentState: form.current_state,
                  desiredState: form.desired_state,
                  businessRationale: form.business_rationale,
                  impactLevel: (form.impact_level || null) as CrImpact | null,
                  impactHours: hours ?? null,
                  impactCost: costCalc ?? null,
                  implementationPlan: form.implementation_plan,
                  notes: form.notes,
                  submittedDate: form.submitted_date,
                  status: form.status,
                }
              : c
          )
        )
      } else {
        const res = await addChangeRequest(projectId, {
          title: form.title,
          cr_number: form.cr_number,
          cr_type: form.cr_type,
          current_state: form.current_state || undefined,
          desired_state: form.desired_state || undefined,
          business_rationale: form.business_rationale || undefined,
          impact_level: form.impact_level || undefined,
          impact_hours: hours,
          impact_cost: costCalc,
          implementation_plan: form.implementation_plan || undefined,
          notes: form.notes || undefined,
          submitted_date: form.submitted_date || undefined,
          status: form.status,
        })
        if ('error' in res) { setFormError(res.error); return }
        const newCr: ChangeRequest = {
          id: res.id,
          projectId,
          crNumber: form.cr_number,
          title: form.title,
          description: null,
          currentState: form.current_state,
          desiredState: form.desired_state,
          businessRationale: form.business_rationale,
          crType: form.cr_type,
          impactLevel: (form.impact_level || null) as CrImpact | null,
          impactHours: hours ?? null,
          impactCost: costCalc ?? null,
          scheduleImpact: null,
          submittedDate: form.submitted_date,
          status: form.status,
          bwApproval: null,
          bwApprovalDate: null,
          clientApproval: null,
          clientApprovalDate: null,
          clientApprover: null,
          implementationPlan: form.implementation_plan,
          notes: form.notes,
          createdAt: new Date().toISOString(),
        }
        setCrs((prev) => [newCr, ...prev])
      }
      setShowForm(false)
      setEditCr(null)
    })
  }

  function handleDelete(crId: string) {
    setCrs((prev) => prev.filter((c) => c.id !== crId))
    startTransition(async () => {
      await deleteChangeRequest(crId)
    })
  }

  function handleApprovalChanged(side: 'bw' | 'client', status: ApprovalStatus) {
    if (!editCr) return
    startTransition(async () => {
      let res: { ok: true } | { error: string }
      if (status === 'pending') {
        // Reset to pending: clear the approval field via updateChangeRequest
        const updateData = side === 'bw'
          ? { status: 'pending' as CrStatus }
          : { status: 'pending' as CrStatus }
        res = await updateChangeRequest(editCr.id, updateData)
      } else {
        res = await approveCr(editCr.id, side, status)
      }
      if ('error' in res) { setFormError(res.error); return }
      // Optimistic update on the CR in list
      setCrs((prev) =>
        prev.map((c) => {
          if (c.id !== editCr.id) return c
          const newBw = side === 'bw' ? status : c.bwApproval
          const newClient = side === 'client' ? status : c.clientApproval
          const newStatus: CrStatus =
            newBw === 'rejected' || newClient === 'rejected'
              ? 'rejected'
              : newBw === 'approved' && newClient === 'approved'
                ? 'approved'
                : newBw === 'approved' || newClient === 'approved'
                  ? 'pending'
                  : c.status
          return {
            ...c,
            bwApproval: newBw,
            clientApproval: newClient,
            status: newStatus,
          }
        })
      )
      // Also update editCr so the approval boxes reflect the new state
      setEditCr((prev) => {
        if (!prev || prev.id !== editCr.id) return prev
        return {
          ...prev,
          bwApproval: side === 'bw' ? status : prev.bwApproval,
          clientApproval: side === 'client' ? status : prev.clientApproval,
        }
      })
    })
  }

  function openEdit(cr: ChangeRequest) {
    setEditCr(cr)
    setPrefillForm(null)
    setFormError('')
    setShowForm(true)
  }

  function openNew() {
    setEditCr(null)
    setPrefillForm(null)
    setFormError('')
    setShowForm(true)
  }

  const editFormData: CrFormData | undefined = editCr
    ? {
        cr_number: editCr.crNumber ?? '',
        title: editCr.title,
        cr_type: editCr.crType,
        submitted_date: editCr.submittedDate ?? new Date().toISOString().slice(0, 10),
        current_state: editCr.currentState ?? '',
        desired_state: editCr.desiredState ?? '',
        business_rationale: editCr.businessRationale ?? '',
        impact_level: editCr.impactLevel ?? '',
        impact_hours: String(editCr.impactHours ?? ''),
        // impact_cost trzyma STAWKĘ (zł/h), nie total; odwróć: total ÷ godziny
        impact_cost: String(
          editCr.impactHours && editCr.impactHours > 0
            ? Math.round((editCr.impactCost ?? 0) / editCr.impactHours)
            : ''
        ),
        implementation_plan: editCr.implementationPlan ?? '',
        notes: editCr.notes ?? '',
        status: editCr.status,
        risk_id: null,
      }
    : undefined

  // Formularz który przekazujemy do dialogu: edycja istniejącego, prefill z ryzyka lub domyślny
  const dialogInitial: CrFormData | undefined = editFormData ?? prefillForm ?? undefined

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-base">Change Requests</h2>
        <button
          type="button"
          onClick={openNew}
          className="rounded-md px-4 py-2 font-meta text-xs font-semibold bg-[#F94213] text-white hover:bg-[#d93410] transition-colors"
        >
          + Nowy CR
        </button>
      </div>

      {/* Summary bar */}
      {crs.length > 0 && (
        <div className="flex gap-4 flex-wrap font-meta text-xs text-muted-foreground px-1">
          <span>Suma godz.: <strong className="text-foreground">{totalHours} h</strong></span>
          {totalCost > 0 && (
            <span>Suma kosztów: <strong className="text-foreground">{totalCost.toLocaleString('pl-PL')} PLN</strong></span>
          )}
          <span>Zatwierdzone: <strong className="text-[#0F6E56]">{approvedCount}</strong></span>
          <span>Odrzucone: <strong className="text-[#A32D2D]">{rejectedCount}</strong></span>
        </div>
      )}

      {/* Table or empty state */}
      {crs.length === 0 ? (
        <EmptyCrState onAdd={openNew} />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-[#171717]">
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide w-20">Nr CR</th>
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide">Tytuł</th>
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide w-28">Typ</th>
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide w-20">Wpływ</th>
                  <th className="text-white px-3 py-2 text-right font-bold tracking-wide w-16">Godz.</th>
                  <th className="text-white px-3 py-2 text-right font-bold tracking-wide w-24">Koszt</th>
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide w-24">Zgłoszono</th>
                  <th className="text-white px-3 py-2 text-left font-bold tracking-wide w-24">Status</th>
                  <th className="text-white px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {crs.map((cr, i) => (
                  <tr
                    key={cr.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/20 transition-colors',
                      i % 2 === 1 && 'bg-muted/10'
                    )}
                  >
                    <td className="px-3 py-2 font-bold text-muted-foreground">{cr.crNumber ?? `CR-${String(i + 1).padStart(3, '0')}`}</td>
                    <td className="px-3 py-2 font-semibold">{cr.title}</td>
                    <td className="px-3 py-2 text-muted-foreground">{CR_TYPE_LABELS[cr.crType]}</td>
                    <td className="px-3 py-2">
                      {cr.impactLevel ? (
                        <span className={cn('inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold', IMPACT_BADGE[cr.impactLevel].cls)}>
                          {IMPACT_BADGE[cr.impactLevel].label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{cr.impactHours ? `${cr.impactHours} h` : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#28B39B] font-semibold">
                      {cr.impactCost ? `${cr.impactCost.toLocaleString('pl-PL')} PLN` : '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(cr.submittedDate)}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border', STATUS_BADGE[cr.status].cls)}>
                        {STATUS_BADGE[cr.status].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => openEdit(cr)}
                          className="text-muted-foreground hover:text-foreground transition-colors px-1"
                          aria-label="Edytuj CR"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cr.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors px-1"
                          aria-label="Usuń CR"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form dialog */}
      {showForm && (
        <CrFormDialog
          onClose={() => { setShowForm(false); setEditCr(null); setPrefillForm(null) }}
          onSave={handleSave}
          initial={dialogInitial}
          crId={editCr?.id}
          initialApprovals={editCr ? { bwApproval: editCr.bwApproval, clientApproval: editCr.clientApproval } : undefined}
          onApprovalChanged={editCr ? handleApprovalChanged : undefined}
          isPending={isPending}
          error={formError}
          existingCount={crs.length}
        />
      )}
    </div>
  )
}
