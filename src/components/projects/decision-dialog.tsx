'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateDecisionPoint } from '@/lib/actions/projects'

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface DecisionInfo {
  id: string
  title: string
  type: 'uat' | 'change_request' | 'deviation' | 'other'
  status: 'pending' | 'yes' | 'no'
  decidedByName?: string | null
  decidedAt?: string | null
  notes?: string | null
}

interface DecisionDialogProps {
  decision: DecisionInfo
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<DecisionInfo['type'], string> = {
  uat: 'UAT',
  change_request: 'CR',
  deviation: 'Odchylenie',
  other: 'Decyzja',
}

const TYPE_BADGE_CLASSES: Record<DecisionInfo['type'], string> = {
  uat: 'bg-teal/10 text-teal border border-teal/30',
  change_request: 'bg-status-at/10 text-status-at border border-status-at/30',
  deviation: 'bg-status-off/10 text-status-off border border-status-off/30',
  other: 'bg-muted text-muted-foreground border border-border',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return ''
  }
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function DecisionDialog({ decision, open, onOpenChange }: DecisionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(decision.notes ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  const isDecided = decision.status !== 'pending'

  async function handleDecide(status: 'yes' | 'no') {
    setLocalError(null)
    startTransition(async () => {
      const result = await updateDecisionPoint(decision.id, status, notes || undefined)
      if ('error' in result) {
        setLocalError(result.error)
      } else {
        router.refresh()
        onOpenChange(false)
      }
    })
  }

  async function handleReset() {
    setLocalError(null)
    startTransition(async () => {
      const result = await updateDecisionPoint(decision.id, 'pending', undefined)
      if ('error' in result) {
        setLocalError(result.error)
      } else {
        router.refresh()
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none font-heading uppercase tracking-wide',
                TYPE_BADGE_CLASSES[decision.type],
              ].join(' ')}
            >
              {TYPE_LABELS[decision.type]}
            </span>
            <DialogTitle className="text-sm font-medium leading-snug flex-1">
              {decision.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Stan obecny gdy zdecydowane */}
          {isDecided && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className={
                    decision.status === 'yes'
                      ? 'text-teal'
                      : 'text-status-off'
                  }
                >
                  {decision.status === 'yes' ? '✓ Robimy' : '✗ Pomijamy'}
                </span>
              </div>
              {decision.decidedByName && (
                <p>
                  Zdecydował: {decision.decidedByName}
                  {decision.decidedAt ? ` · ${formatDate(decision.decidedAt)}` : ''}
                </p>
              )}
              {decision.notes && (
                <p className="text-foreground/70 italic">{decision.notes}</p>
              )}
            </div>
          )}

          {/* Pole notatki — zawsze dostępne gdy pending, przy zdecydowanych ukryte */}
          {!isDecided && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="decision-notes" className="text-xs font-medium text-muted-foreground">
                Notatka <span className="text-muted-foreground/60">(opcjonalna)</span>
              </label>
              <textarea
                id="decision-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodaj kontekst decyzji..."
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-teal/40 disabled:opacity-50"
                disabled={isPending}
              />
            </div>
          )}

          {/* Błąd */}
          {localError && (
            <p className="text-xs text-status-off font-medium">{localError}</p>
          )}

          {/* Przyciski akcji */}
          {!isDecided ? (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => handleDecide('yes')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Robimy
              </button>
              <button
                type="button"
                onClick={() => handleDecide('no')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-status-off/30 bg-status-off/10 px-4 py-1.5 text-xs font-semibold text-status-off transition-colors hover:bg-status-off/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✗ Pomijamy
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zmień decyzję
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
