'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateStepTemplateTitle, updateTaskTemplateTitle, updateTaskTemplateEst } from '@/lib/actions/templates'

// ---------------------------------------------------------------------------
// TemplateStepEditor — inline edycja tytułu klocka szablonu
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
          aria-label="Edytuj tytuł klocka"
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
          aria-label="Tytuł klocka"
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
// TemplateTaskEditor — inline edycja tytułu i estymacji zadania szablonu
// ---------------------------------------------------------------------------
export function TemplateTaskEditor({
  taskId,
  currentTitle,
  currentEst,
  isMilestone,
}: {
  taskId: string
  currentTitle: string
  currentEst: number | null
  isMilestone: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [titleValue, setTitleValue] = useState(currentTitle)
  const [estValue, setEstValue] = useState(currentEst?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setTitleValue(currentTitle)
    setEstValue(currentEst?.toString() ?? '')
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
      const [r1, r2] = await Promise.all([
        updateTaskTemplateTitle(taskId, titleValue),
        updateTaskTemplateEst(taskId, parsedEst),
      ])
      const err = ('error' in r1 ? r1.error : null) ?? ('error' in r2 ? r2.error : null)
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
        <span className="font-meta text-xs text-foreground truncate">{currentTitle}</span>
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
          aria-label="Tytuł zadania"
          disabled={isPending}
          placeholder="Tytuł zadania"
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
