'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { ImplType } from '@/lib/data/projects'

const STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie statusy' },
  { value: 'active', label: 'Aktywne' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'archived', label: 'Archiwum' },
]

const IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

interface ProjectFiltersProps {
  clients: { id: string; name: string }[]
}

export function ProjectFilters({ clients }: ProjectFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      return params.toString()
    },
    [searchParams]
  )

  const currentStatus = searchParams.get('status') ?? ''
  const currentType = searchParams.get('type') ?? ''
  const currentClient = searchParams.get('client') ?? ''
  const currentAtRisk = searchParams.get('atRisk') === '1'

  const setFilter = (key: string, value: string) => {
    const qs = createQueryString({ [key]: value })
    router.push(`${pathname}?${qs}`)
  }

  const toggleAtRisk = () => {
    const qs = createQueryString({ atRisk: currentAtRisk ? '' : '1' })
    router.push(`${pathname}?${qs}`)
  }

  const hasFilters = currentStatus || currentType || currentClient || currentAtRisk

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtry projektów">
      {/* Status */}
      <select
        value={currentStatus}
        onChange={(e) => setFilter('status', e.target.value)}
        className="h-7 rounded-full border border-border bg-background px-2.5 font-meta text-xs text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:border-teal/40"
        aria-label="Filtruj według statusu"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Typ wdrożenia */}
      <select
        value={currentType}
        onChange={(e) => setFilter('type', e.target.value)}
        className="h-7 rounded-full border border-border bg-background px-2.5 font-meta text-xs text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:border-teal/40"
        aria-label="Filtruj według typu wdrożenia"
      >
        <option value="">Wszystkie typy</option>
        {IMPL_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Klient */}
      {clients.length > 0 && (
        <select
          value={currentClient}
          onChange={(e) => setFilter('client', e.target.value)}
          className="h-7 rounded-full border border-border bg-background px-2.5 font-meta text-xs text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:border-teal/40"
          aria-label="Filtruj według klienta"
        >
          <option value="">Wszyscy klienci</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Tylko zagrożone */}
      <button
        type="button"
        onClick={toggleAtRisk}
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-meta text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          currentAtRisk
            ? 'border-status-off bg-status-off/10 text-status-off'
            : 'border-border bg-background text-muted-foreground hover:border-status-off/40 hover:text-status-off'
        )}
        aria-pressed={currentAtRisk}
        aria-label="Pokaż tylko projekty zagrożone"
      >
        <span aria-hidden="true">⚠</span>
        Tylko zagrożone
      </button>

      {/* Wyczyść filtry */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="h-7 rounded-full px-2.5 font-meta text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Wyczyść wszystkie filtry"
        >
          Wyczyść filtry
        </button>
      )}
    </div>
  )
}
