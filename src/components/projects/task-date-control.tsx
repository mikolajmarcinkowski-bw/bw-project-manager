'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateTaskDueDate, getTaskDateHistory } from '@/lib/actions/tasks'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

function formatDatePL(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ─── Komponent ───────────────────────────────────────────────────────────────

interface TaskDateControlProps {
  taskId: string
  dueDate: string | null
  /** Wyróżnienie: 'overdue' = czerwona, 'soon' = żółta, undefined = normalna */
  alertLevel?: 'overdue' | 'soon'
}

type HistoryEntry = { actorName: string | null; before: string | null; after: string | null; at: string }

export function TaskDateControl({ taskId, dueDate, alertLevel }: TaskDateControlProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState(dueDate ?? '')
  const [confirm, setConfirm] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const confirmWord = 'zmień'
  const isConfirmed = confirm.trim().toLowerCase() === confirmWord
  const hasChanged = newDate !== (dueDate ?? '')

  function openDialog() {
    setNewDate(dueDate ?? '')
    setConfirm('')
    setError(null)
    setOpen(true)
    // Pobierz historię przy otwarciu
    setHistoryLoading(true)
    getTaskDateHistory(taskId)
      .then((rows) => setHistory(rows))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }

  function handleSubmit() {
    if (!hasChanged) return
    if (!isConfirmed) {
      setError(`Wpisz „${confirmWord}" aby potwierdzić zmianę terminu.`)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateTaskDueDate(taskId, newDate || null)
      if ('error' in result) {
        setError(result.error)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  // ─── Trigger ───────────────────────────────────────────────────────────────

  const triggerClasses = cn(
    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 leading-none',
    'text-[0.55rem] font-mono font-semibold',
    'cursor-pointer select-none transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
    alertLevel === 'overdue' && 'bg-status-off/15 text-status-off hover:bg-status-off/25',
    alertLevel === 'soon'    && 'bg-status-at/15 text-status-at hover:bg-status-at/25',
    !alertLevel && dueDate   && 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
    !dueDate                 && 'bg-muted/40 text-muted-foreground/50 hover:bg-muted/60 hover:text-muted-foreground'
  )

  return (
    <>
      <button
        type="button"
        aria-label={dueDate ? `Termin: ${formatDatePL(dueDate)}. Kliknij aby zmienić` : 'Ustaw termin zadania'}
        onClick={openDialog}
        className={triggerClasses}
      >
        {dueDate ? (
          <>
            <CalendarDays aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />
            {formatDatePL(dueDate)}
          </>
        ) : (
          <>
            <Plus aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />
            termin
          </>
        )}
      </button>

      {/* ─── Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zmień termin zadania</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {/* Nowa data */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-date-input">Nowy termin</Label>
              <Input
                id="task-date-input"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min="2000-01-01"
              />
            </div>

            {/* Potwierdzenie — wymagane gdy data się zmieniła */}
            {hasChanged && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-date-confirm">
                  Wpisz <span className="font-mono font-bold text-foreground">„{confirmWord}"</span> aby potwierdzić
                </Label>
                <Input
                  id="task-date-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={confirmWord}
                  autoComplete="off"
                  className={cn(isConfirmed && 'border-teal')}
                />
                <p className="font-meta text-[0.65rem] text-muted-foreground">
                  Zmiana terminu zeruje aktywne wyciszenie alertu.
                </p>
              </div>
            )}

            {/* Błąd */}
            {error && (
              <p className="font-meta text-xs text-destructive" role="alert">
                {error}
              </p>
            )}

            {/* Historia zmian */}
            {(history.length > 0 || historyLoading) && (
              <div className="flex flex-col gap-1.5">
                <span className="font-meta text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  Historia
                </span>
                {historyLoading ? (
                  <p className="font-meta text-xs text-muted-foreground">Ładowanie…</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {history.map((h, i) => (
                      <li key={i} className="font-mono text-[0.6rem] text-muted-foreground flex items-center gap-1.5">
                        <span>{h.actorName ?? 'PM'}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{h.before ? formatDatePL(h.before) : '—'}</span>
                        <span className="text-muted-foreground/40">→</span>
                        <span>{h.after ? formatDatePL(h.after) : '—'}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{h.at.slice(0, 10).split('-').reverse().join('.')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={handleSubmit}
              disabled={!hasChanged || !isConfirmed || isPending}
            >
              {isPending ? 'Zapisywanie…' : 'Zapisz termin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
