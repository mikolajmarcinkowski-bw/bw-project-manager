'use client'

import { useTransition, useState, useOptimistic, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { updateTaskEst } from '@/lib/actions/tasks'

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface TaskEstControlProps {
  taskId: string
  est: number | null
}

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

/** Formatuj liczbę godzin: 4 → "4", 4.5 → "4.5" (bez zbędnych zer dziesiętnych) */
function formatEst(est: number): string {
  return String(est % 1 === 0 ? Math.trunc(est) : est)
}

/** Parsuj ciąg z inputa na number | null. Pusty string → null. */
function parseEst(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '—') return null
  const parsed = parseFloat(trimmed)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 0 || parsed > 9999) return null
  // Zaokrąglamy do 0.5h (zsync z logiką serwera)
  return Math.round(parsed * 2) / 2
}

// ─── Komponent ────────────────────────────────────────────────────────────────

export function TaskEstControl({ taskId, est }: TaskEstControlProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')

  // Używamy useOptimistic do natychmiastowej aktualizacji UI przed potwierdzeniem serwera
  const [optimisticEst, setOptimisticEst] = useOptimistic(
    est,
    (_: number | null, next: number | null) => next
  )

  // Ref do pominięcia zapisu przy Escape — blur zawsze wypali po Escape,
  // bez tego cancelRef zapis nastąpiłby mimo anulowania.
  const cancelRef = useRef(false)
  // Ref do śledzenia wartości przy wejściu w tryb edycji (do porównania przy blur)
  const originalEstRef = useRef<number | null>(null)

  // ─── Wejście w tryb edycji ─────────────────────────────────────────────────

  function enterEdit() {
    if (isEditing) return
    cancelRef.current = false
    originalEstRef.current = optimisticEst
    setInputValue(optimisticEst != null ? formatEst(optimisticEst) : '')
    setError(null)
    setIsEditing(true)
  }

  // ─── Commit (zapis) — wywoływany tylko przez onBlur ───────────────────────

  const commit = useCallback(
    (rawValue: string) => {
      // Jeśli anulowano przez Escape — tylko zamykamy edycję
      if (cancelRef.current) {
        setIsEditing(false)
        return
      }

      const parsed = parseEst(rawValue)

      // Brak zmiany — nie zapisujemy
      if (parsed === originalEstRef.current) {
        setIsEditing(false)
        return
      }

      setIsEditing(false)
      setError(null)

      startTransition(async () => {
        setOptimisticEst(parsed)
        const result = await updateTaskEst(taskId, parsed)
        if ('error' in result) {
          setError(result.error)
        } else {
          router.refresh()
        }
      })
    },
    [taskId, router, startTransition, setOptimisticEst]
  )

  // ─── Obsługa klawiatury ────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Enter → blur wywoła commit
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // Escape → oznaczamy anulowanie, blur wywoła commit z cancelRef=true
      cancelRef.current = true
      e.currentTarget.blur()
    }
  }

  // ─── Tryb wyświetlania ─────────────────────────────────────────────────────

  if (!isEditing) {
    return (
      <span className="inline-flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={enterEdit}
          aria-label={
            optimisticEst != null
              ? `Estymacja: ${optimisticEst}h. Kliknij aby edytować`
              : 'Edytuj estymację'
          }
          title={
            optimisticEst != null
              ? `Estymacja: ${optimisticEst}h`
              : 'Brak estymacji'
          }
          className={cn(
            'font-mono text-[0.65rem] leading-none',
            'bg-transparent border-none p-0 cursor-text',
            'transition-colors motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal focus-visible:ring-offset-1 rounded-sm',
            isPending && 'opacity-50 cursor-wait',
            // null → jeszcze bardziej przygaszone
            optimisticEst != null
              ? 'text-muted-foreground/60 hover:text-foreground'
              : 'text-muted-foreground/30 hover:text-muted-foreground/60'
          )}
        >
          {optimisticEst != null ? `${formatEst(optimisticEst)}h` : '—'}
        </button>

        {/* Błąd — mały tekst pod wartością */}
        {error && (
          <span
            role="alert"
            className="block max-w-[48px] truncate text-[0.5rem] font-heading text-destructive leading-none"
            title={error}
          >
            {error}
          </span>
        )}
      </span>
    )
  }

  // ─── Tryb edycji ──────────────────────────────────────────────────────────

  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <input
        type="number"
        step="0.5"
        min="0"
        max="9999"
        value={inputValue}
        autoFocus
        aria-label="Edytuj estymację"
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={handleKeyDown}
        onBlur={(e) => commit(e.currentTarget.value)}
        className={cn(
          'w-[44px] font-mono text-[0.65rem] text-center leading-none',
          'bg-transparent border border-teal/50 rounded-sm px-0.5 py-0.5',
          'outline-none focus:border-teal focus:ring-1 focus:ring-teal focus:ring-offset-0',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          isPending && 'opacity-50'
        )}
      />

      {/* Błąd — mały tekst pod inputem */}
      {error && (
        <span
          role="alert"
          className="block max-w-[48px] truncate text-[0.5rem] font-heading text-destructive leading-none"
          title={error}
        >
          {error}
        </span>
      )}
    </span>
  )
}
