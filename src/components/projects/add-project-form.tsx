'use client'

import { useState, useTransition, useMemo, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProjectAction } from '@/lib/actions/projects'
import type { TaskTemplateForCreation, ImplType } from '@/lib/data/projects'
import { taskMatchesTypes } from '@/lib/utils'

// ─── Stałe ───────────────────────────────────────────────────────────────────

const IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

const IMPL_TYPE_DESCRIPTIONS: Record<ImplType, string> = {
  CRM: 'zarządzanie relacjami',
  SPO: 'SharePoint Online',
  INT: 'integracje',
  MKT: 'marketing',
  ERP: 'systemy ERP',
}

// Kolory chipów `kind` — inline style (Tailwind v4 nie emituje dynamicznych klas)
const KIND_CHIP_COLORS: Record<TaskTemplateForCreation['kind'], { bg: string; text: string }> = {
  ws:     { bg: '#185FA5', text: '#ffffff' },
  own:    { bg: '#E06C1A', text: '#ffffff' },
  config: { bg: '#28B39B', text: '#ffffff' },
  test:   { bg: '#EF9F27', text: '#ffffff' },
  pm:     { bg: '#9DA8A5', text: '#ffffff' },
  ms:     { bg: '#8257E6', text: '#ffffff' },
}

// ─── Typy ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2

type Step1Data = {
  client_id: string
  name: string
  types: ImplType[]
  pm_ids: string[]
  start_date: string
  end_date?: string
  description?: string
}

// Zgrupowane zadania dla kroku 2
type GroupedPhase = {
  phaseNumber: number
  phaseName: string
  steps: GroupedStep[]
}

type GroupedStep = {
  stepTemplateId: string
  stepTitle: string
  tasks: TaskTemplateForCreation[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddProjectFormProps {
  clients: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
  taskTemplates: TaskTemplateForCreation[]
  defaultClientId?: string
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6" aria-label="Kroki formularza">
      {([1, 2] as const).map((n) => {
        const isActive = current === n
        const isDone = current > n
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={[
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors',
                isActive
                  ? 'border-teal bg-teal text-white'
                  : isDone
                    ? 'border-teal bg-teal/10 text-teal'
                    : 'border-border bg-muted text-muted-foreground',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone ? <Check className="size-3.5" aria-hidden="true" /> : n}
            </div>
            <span
              className={[
                'text-xs font-medium',
                isActive ? 'text-teal' : 'text-muted-foreground',
              ].join(' ')}
            >
              {n === 1 ? 'Dane projektu' : 'Konfiguracja zadań'}
            </span>
            {n < 2 && (
              <div className="w-8 h-px bg-border mx-1" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Krok 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  clients: { id: string; name: string }[]
  profiles: { id: string; full_name: string }[]
  defaultClientId?: string
  onNext: (data: Step1Data) => void
  initialData: Step1Data | null
}

function Step1Form({ clients, profiles, defaultClientId, onNext, initialData }: Step1Props) {
  const router = useRouter()
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setValidationError(null)

    const fd = new FormData(e.currentTarget)

    const client_id = (fd.get('client_id') as string | null) ?? ''
    const name = ((fd.get('name') as string | null) ?? '').trim()
    const types = fd.getAll('types') as ImplType[]
    const pmRaw = fd.getAll('pm_ids') as string[]
    const pm_ids = pmRaw.filter((v) => v && v !== 'none')
    const start_date = (fd.get('start_date') as string | null) ?? ''
    const end_dateRaw = (fd.get('end_date') as string | null) ?? ''
    const descriptionRaw = (fd.get('description') as string | null) ?? ''

    // Walidacja client-side przed przejściem do kroku 2
    if (!name) {
      setValidationError('Nazwa projektu nie może być pusta.')
      return
    }
    if (!client_id) {
      setValidationError('Wybierz klienta.')
      return
    }
    if (types.length === 0) {
      setValidationError('Wybierz co najmniej jeden typ wdrożenia.')
      return
    }
    if (!start_date) {
      setValidationError('Data startu jest wymagana.')
      return
    }

    onNext({
      client_id,
      name,
      types,
      pm_ids,
      start_date,
      end_date: end_dateRaw || undefined,
      description: descriptionRaw || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Klient */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-client">
          Klient <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        {defaultClientId ? (
          <>
            <input type="hidden" name="client_id" value={defaultClientId} />
            <p className="font-meta text-sm text-muted-foreground">
              {clients.find((c) => c.id === defaultClientId)?.name ?? defaultClientId}
            </p>
          </>
        ) : (
          <Select name="client_id" defaultValue={initialData?.client_id ?? undefined}>
            <SelectTrigger id="project-client" className="w-full">
              <SelectValue placeholder="Wybierz klienta...">
                {(value) =>
                  clients.find((c) => c.id === value)?.name ?? 'Wybierz klienta...'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Nazwa projektu */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-name">
          Nazwa projektu <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="project-name"
          name="name"
          placeholder="np. Wdrożenie CRM dla Klienta ABC"
          defaultValue={initialData?.name ?? ''}
          autoFocus={!defaultClientId}
        />
      </div>

      {/* Typy wdrożenia */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium leading-none mb-1.5">
          Typy wdrożenia{' '}
          <span className="text-destructive" aria-hidden="true">*</span>
          <span className="font-meta text-xs text-muted-foreground ml-2 font-normal">
            (wybierz co najmniej jeden)
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {IMPL_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm cursor-pointer transition-colors hover:border-teal/40 hover:bg-muted/60 has-[:checked]:border-teal has-[:checked]:bg-teal/5 has-[:checked]:text-teal has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1"
            >
              <input
                type="checkbox"
                name="types"
                value={type}
                defaultChecked={initialData?.types.includes(type) ?? false}
                className="peer sr-only"
              />
              <Check
                className="size-3.5 text-teal opacity-0 transition-opacity peer-checked:opacity-100"
                aria-hidden="true"
              />
              <span className="font-mono text-[0.7rem] font-semibold">{type}</span>
              <span className="font-meta text-xs text-muted-foreground">
                {IMPL_TYPE_DESCRIPTIONS[type]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* PM */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-pm">Kierownik projektu (PM)</Label>
        <Select
          name="pm_ids"
          defaultValue={initialData?.pm_ids[0] ?? 'none'}
        >
          <SelectTrigger id="project-pm" className="w-full">
            <SelectValue placeholder="Wybierz PM...">
              {(value) =>
                !value || value === 'none'
                  ? 'Bez PM (przypiszę później)'
                  : (profiles.find((p) => p.id === value)?.full_name ?? 'PM')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Bez PM (przypiszę później) —</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Daty */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-start">
            Data startu <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="project-start"
            name="start_date"
            type="date"
            min="2000-01-01"
            defaultValue={initialData?.start_date ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="project-end">Deadline</Label>
          <Input
            id="project-end"
            name="end_date"
            type="date"
            min="2000-01-01"
            defaultValue={initialData?.end_date ?? ''}
            aria-label="Termin zakończenia projektu (opcjonalne)"
          />
        </div>
      </div>

      {/* Opis */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-description">Opis</Label>
        <textarea
          id="project-description"
          name="description"
          rows={3}
          placeholder="Krótki opis zakresu projektu (opcjonalne)..."
          defaultValue={initialData?.description ?? ''}
          className="h-auto w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm resize-none transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          aria-label="Opis projektu (opcjonalne)"
        />
      </div>

      {/* Błąd walidacji */}
      {validationError && (
        <p className="font-meta text-xs text-destructive" role="alert">
          {validationError}
        </p>
      )}

      {/* Akcje */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => router.back()}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          size="sm"
          className="rounded-full gap-1.5"
        >
          Dalej
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </form>
  )
}

// ─── Krok 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  step1Data: Step1Data
  taskTemplates: TaskTemplateForCreation[]
  naIds: Set<string>
  onToggle: (id: string, checked: boolean) => void
  onBack: () => void
  isPending: boolean
  submitError: string | null
  onSubmit: () => void
}

function Step2Tasks({
  step1Data,
  taskTemplates,
  naIds,
  onToggle,
  onBack,
  isPending,
  submitError,
  onSubmit,
}: Step2Props) {
  // Filtruj i grupuj zadania — useMemo żeby nie przeliczać przy każdym re-renderze
  const { phases, totalCount, hiddenCount } = useMemo(() => {
    const filtered = taskTemplates.filter((t) =>
      taskMatchesTypes(t.appliesTo, step1Data.types)
    )

    const phaseMap = new Map<number, GroupedPhase>()

    for (const task of filtered) {
      let phase = phaseMap.get(task.phaseNumber)
      if (!phase) {
        phase = { phaseNumber: task.phaseNumber, phaseName: task.phaseName, steps: [] }
        phaseMap.set(task.phaseNumber, phase)
      }

      let step = phase.steps.find((s) => s.stepTemplateId === task.stepTemplateId)
      if (!step) {
        step = { stepTemplateId: task.stepTemplateId, stepTitle: task.stepTitle, tasks: [] }
        phase.steps.push(step)
      }
      step.tasks.push(task)
    }

    const phases = Array.from(phaseMap.values()).sort((a, b) => a.phaseNumber - b.phaseNumber)

    // Zliczamy ukryte tylko wśród zadań z bieżącego zestawu filtrowanego
    const filteredIds = new Set(filtered.map((t) => t.id))
    const hiddenCount = Array.from(naIds).filter((id) => filteredIds.has(id)).length

    return { phases, totalCount: filtered.length, hiddenCount }
  }, [taskTemplates, step1Data.types, naIds])

  return (
    <div className="flex flex-col gap-5">
      {/* Nagłówek kroku 2 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Konfiguracja zadań</h3>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            Krok 2 z 2{' '}
            <span className="mx-1.5 text-border">·</span>
            <span>{totalCount} zadań</span>
            {hiddenCount > 0 && (
              <>
                <span className="mx-1.5 text-border">·</span>
                <span className="text-muted-foreground">{hiddenCount} ukrytych</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Lista faz + zadania */}
      <div className="max-h-[420px] overflow-y-auto flex flex-col gap-4 pr-1">
        {phases.length === 0 ? (
          <p className="font-meta text-sm text-muted-foreground py-4 text-center">
            Brak zadań pasujących do wybranych typów wdrożenia.
          </p>
        ) : (
          phases.map((phase) => (
            <PhaseSection
              key={phase.phaseNumber}
              phase={phase}
              naIds={naIds}
              onToggle={onToggle}
            />
          ))
        )}
      </div>

      {/* Błąd submit */}
      {submitError && (
        <p className="font-meta text-xs text-destructive" role="alert">
          {submitError}
        </p>
      )}

      {/* Akcje */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          onClick={onBack}
          disabled={isPending}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Wstecz
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-full gap-1.5"
          disabled={isPending}
          onClick={onSubmit}
        >
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          )}
          Utwórz projekt
        </Button>
      </div>
    </div>
  )
}

// ─── Sekcja fazy ──────────────────────────────────────────────────────────────

function PhaseSection({
  phase,
  naIds,
  onToggle,
}: {
  phase: GroupedPhase
  naIds: Set<string>
  onToggle: (id: string, checked: boolean) => void
}) {
  // Czy wszystkie zadania w tej fazie są N/A
  const allTaskIds = phase.steps.flatMap((s) => s.tasks.map((t) => t.id))
  const allHidden = allTaskIds.length > 0 && allTaskIds.every((id) => naIds.has(id))

  function togglePhase() {
    if (allHidden) {
      // Pokaż wszystkie w tej fazie
      allTaskIds.forEach((id) => onToggle(id, true))
    } else {
      // Ukryj wszystkie w tej fazie
      allTaskIds.forEach((id) => onToggle(id, false))
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Nagłówek fazy */}
      <div className="flex items-center justify-between border-l-2 border-teal pl-3 py-1 mb-1">
        <span className="font-heading text-xs font-bold uppercase tracking-wide text-teal-strong">
          Faza {phase.phaseNumber} — {phase.phaseName}
        </span>
        <button
          type="button"
          onClick={togglePhase}
          className="font-meta text-[0.65rem] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded hover:bg-muted"
        >
          {allHidden ? 'Pokaż wszystkie' : 'Ukryj wszystkie'}
        </button>
      </div>

      {/* Kroki i zadania */}
      <div className="flex flex-col gap-3">
        {phase.steps.map((step) => (
          <div key={step.stepTemplateId} className="flex flex-col gap-1">
            {/* Tytuł kroku */}
            <p className="font-meta text-[0.7rem] font-semibold text-muted-foreground uppercase tracking-wide pl-2 mb-0.5">
              {step.stepTitle}
            </p>
            {/* Zadania */}
            <div className="flex flex-col gap-1">
              {step.tasks.map((task) => {
                const isActive = !naIds.has(task.id)
                const chipColors = KIND_CHIP_COLORS[task.kind]
                return (
                  <label
                    key={task.id}
                    className={[
                      'flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none',
                      isActive
                        ? 'border-border bg-card hover:border-teal/30 hover:bg-teal/5'
                        : 'border-border/50 bg-muted/40 hover:bg-muted/60',
                    ].join(' ')}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => onToggle(task.id, e.target.checked)}
                      className="sr-only peer"
                      aria-label={`Uwzględnij zadanie: ${task.taskTitle}`}
                    />
                    <div
                      className={[
                        'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                        isActive
                          ? 'border-teal bg-teal'
                          : 'border-border bg-background',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {isActive && (
                        <Check className="size-2.5 text-white" />
                      )}
                    </div>

                    {/* Tytuł zadania */}
                    <span
                      className={[
                        'flex-1 text-sm transition-colors',
                        isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground line-through',
                      ].join(' ')}
                    >
                      {task.taskTitle}
                    </span>

                    {/* Chip kind */}
                    <span
                      className="font-mono text-[0.6rem] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                      style={{
                        backgroundColor: chipColors.bg,
                        color: chipColors.text,
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      {task.kind}
                    </span>

                    {/* Est */}
                    {task.est !== null && (
                      <span
                        className={[
                          'font-mono text-[0.65rem] flex-shrink-0 tabular-nums',
                          isActive ? 'text-muted-foreground' : 'text-muted-foreground/50',
                        ].join(' ')}
                      >
                        {task.est}h
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Główny komponent ─────────────────────────────────────────────────────────

export function AddProjectForm({
  clients,
  profiles,
  taskTemplates,
  defaultClientId,
}: AddProjectFormProps) {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [naIds, setNaIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleStep1Next(data: Step1Data) {
    setStep1Data(data)
    setStep(2)
  }

  function handleBack() {
    setStep(1)
    // step1Data i naIds zachowane — nie resetujemy
  }

  function handleToggle(id: string, checked: boolean) {
    setNaIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.delete(id) // zaznaczono = aktywne = usuń z N/A
      } else {
        next.add(id) // odznaczono = N/A = dodaj do zbioru
      }
      return next
    })
  }

  function handleFinalSubmit() {
    if (!step1Data) return
    setSubmitError(null)
    startTransition(async () => {
      const result = await createProjectAction({
        ...step1Data,
        na_template_ids: Array.from(naIds),
      })
      if ('error' in result) {
        setSubmitError(result.error)
      } else {
        if (step1Data.client_id === defaultClientId && defaultClientId) {
          router.push(`/clients/${defaultClientId}`)
        } else {
          router.push('/dashboard')
        }
      }
    })
  }

  return (
    <div className="flex flex-col">
      <StepIndicator current={step} />

      {step === 1 ? (
        <Step1Form
          clients={clients}
          profiles={profiles}
          defaultClientId={defaultClientId}
          onNext={handleStep1Next}
          initialData={step1Data}
        />
      ) : (
        step1Data && (
          <Step2Tasks
            step1Data={step1Data}
            taskTemplates={taskTemplates}
            naIds={naIds}
            onToggle={handleToggle}
            onBack={handleBack}
            isPending={isPending}
            submitError={submitError}
            onSubmit={handleFinalSubmit}
          />
        )
      )}
    </div>
  )
}
