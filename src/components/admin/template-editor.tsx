'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  updateStepTemplateTitle,
  updateTaskTemplateTitle,
  updateTaskTemplateEst,
  updateTaskTemplateTypes,
  addTaskToStep,
} from '@/lib/actions/templates'

// ---------------------------------------------------------------------------
// Type chip colours — CRM/SPO/INT/MKT/ERP
// ---------------------------------------------------------------------------
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRM: { bg: 'bg-teal/10',        text: 'text-teal',        border: 'border-teal/30' },
  SPO: { bg: 'bg-spo/10',         text: 'text-spo',         border: 'border-spo/30' },
  INT: { bg: 'bg-[#378ADD]/10',   text: 'text-[#378ADD]',   border: 'border-[#378ADD]/30' },
  MKT: { bg: 'bg-[#EF7DAE]/10',   text: 'text-[#EF7DAE]',   border: 'border-[#EF7DAE]/30' },
  ERP: { bg: 'bg-status-at/10',   text: 'text-status-at',   border: 'border-status-at/30' },
}
const ALL_TYPES = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

// ---------------------------------------------------------------------------
// TemplateStepEditor — inline edycja tytulu klocka szablonu
// ---------------------------------------------------------------------------
export function TemplateStepEditor({
  stepId,
  currentTitle,
  ownerRole,
}: {
  stepId: string
  currentTitle: string
  ownerRole: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentTitle)
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setValue(currentTitle)
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateStepTemplateTitle(stepId, value)
      if ('error' in result) {
        setError(result.error)
      } else {
        setIsEditing(false)
        router.refresh()
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="font-heading font-semibold text-sm text-foreground">{currentTitle}</span>
        {ownerRole && (
          <span className="font-meta text-[0.65rem] text-muted-foreground">({ownerRole})</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          onClick={handleEdit}
          aria-label="Edytuj tytul klocka"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-sm w-72"
          autoFocus
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          aria-label="Tytul klocka"
          disabled={isPending}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-teal hover:bg-teal/10"
          onClick={handleSave}
          disabled={isPending}
          aria-label="Zapisz"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-muted-foreground hover:bg-muted"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Anuluj"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TemplateTaskEditor — inline edycja tytulu, estymacji i typow zadania
// ---------------------------------------------------------------------------
export function TemplateTaskEditor({
  taskId,
  currentTitle,
  currentEst,
  currentAppliesTo,
  isMilestone,
}: {
  taskId: string
  currentTitle: string
  currentEst: number | null
  currentAppliesTo: string[]
  isMilestone: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(currentTitle)
  const [estValue, setEstValue] = useState(currentEst?.toString() ?? '')
  const [appliesTo, setAppliesTo] = useState<string[]>(currentAppliesTo)
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setTitleValue(currentTitle)
    setEstValue(currentEst?.toString() ?? '')
    setAppliesTo(currentAppliesTo)
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    setError(null)
    const parsedEst = estValue === '' ? null : parseFloat(estValue)
    startTransition(async () => {
      const [r1, r2, r3] = await Promise.all([
        updateTaskTemplateTitle(taskId, titleValue),
        updateTaskTemplateEst(taskId, parsedEst),
        updateTaskTemplateTypes(taskId, appliesTo),
      ])
      const err =
        ('error' in r1 ? r1.error : null) ??
        ('error' in r2 ? r2.error : null) ??
        ('error' in r3 ? r3.error : null)
      if (err) {
        setError(err)
      } else {
        setIsEditing(false)
        router.refresh()
      }
    })
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group min-w-0">
        {isMilestone && (
          <span className="font-mono text-[0.6rem] text-spo shrink-0" aria-hidden="true">
            &#9670;
          </span>
        )}
        <span className="flex-1 font-meta text-xs leading-snug truncate text-foreground">
          {currentTitle}
        </span>
        {/* Chipy typow */}
        <div className="flex items-center gap-1 shrink-0">
          {currentAppliesTo.length === 0 ? (
            <span className="font-meta text-[0.6rem] text-muted-foreground/50">Wszystkie</span>
          ) : (
            currentAppliesTo.map((type) => {
              const c = TYPE_COLORS[type]
              return (
                <span
                  key={type}
                  className={cn(
                    'inline-flex items-center rounded-full px-1.5 py-0 font-heading font-semibold text-[0.55rem] border',
                    c.bg,
                    c.text,
                    c.border
                  )}
                >
                  {type}
                </span>
              )
            })
          )}
        </div>
        {currentEst != null && (
          <span className="font-mono text-[0.65rem] text-muted-foreground shrink-0">
            {currentEst}h
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ml-auto shrink-0"
          onClick={handleEdit}
          aria-label="Edytuj zadanie"
        >
          <Pencil className="h-2.5 w-2.5" aria-hidden="true" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          className="h-7 text-xs w-64"
          autoFocus
          maxLength={300}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel()
          }}
          aria-label="Tytul zadania"
          disabled={isPending}
          placeholder="Tytul zadania"
        />
        <Input
          type="number"
          value={estValue}
          onChange={(e) => setEstValue(e.target.value)}
          className="h-7 text-xs w-20"
          min={0}
          max={9999}
          step={0.5}
          aria-label="Estymacja godzin"
          disabled={isPending}
          placeholder="h"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-teal hover:bg-teal/10"
          onClick={handleSave}
          disabled={isPending}
          aria-label="Zapisz"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-muted-foreground hover:bg-muted"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Anuluj"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {/* Przelaczniki typow */}
      <div className="flex items-center gap-1 flex-wrap mt-1">
        <span className="font-meta text-[0.65rem] text-muted-foreground mr-1">Typy:</span>
        {ALL_TYPES.map((type) => {
          const isSelected = appliesTo.includes(type)
          const c = TYPE_COLORS[type]
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setAppliesTo((prev) =>
                  prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                )
              }}
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 font-heading font-semibold text-[0.6rem] border transition-colors',
                isSelected
                  ? cn(c.bg, c.text, c.border)
                  : 'bg-muted text-muted-foreground border-border opacity-50'
              )}
              aria-pressed={isSelected}
            >
              {type}
            </button>
          )
        })}
        {appliesTo.length > 0 && (
          <button
            type="button"
            onClick={() => setAppliesTo([])}
            className="font-meta text-[0.6rem] text-muted-foreground hover:text-foreground ml-1"
          >
            Wyczysc (wszystkie typy)
          </button>
        )}
      </div>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AddTaskButton — dodawanie nowego zadania do klocka szablonu
// ---------------------------------------------------------------------------
export function AddTaskButton({ stepTemplateId }: { stepTemplateId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    startTransition(async () => {
      const result = await addTaskToStep(stepTemplateId, title)
      if ('error' in result) {
        setError(result.error)
      } else {
        setIsAdding(false)
        setTitle('')
        router.refresh()
      }
    })
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 ml-4 font-meta text-[0.65rem] text-muted-foreground hover:text-teal transition-colors py-1"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        Dodaj zadanie
      </button>
    )
  }

  return (
    <div className="ml-4 flex flex-col gap-1 py-1">
      <div className="flex items-center gap-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-7 text-xs w-56"
          autoFocus
          maxLength={300}
          placeholder="Tytul nowego zadania"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
            if (e.key === 'Escape') setIsAdding(false)
          }}
          disabled={isPending}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-teal hover:bg-teal/10"
          onClick={handleAdd}
          disabled={isPending || !title.trim()}
          aria-label="Dodaj"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded text-muted-foreground hover:bg-muted"
          onClick={() => setIsAdding(false)}
          disabled={isPending}
          aria-label="Anuluj"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p className="font-meta text-[0.68rem] text-status-off" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
