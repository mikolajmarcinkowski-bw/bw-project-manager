'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition, useRef } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImplType } from '@/lib/data/projects'

const STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie statusy' },
  { value: 'active', label: 'Aktywne' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'archived', label: 'Archiwum' },
]

const IMPL_TYPES: ImplType[] = ['CRM', 'SPO', 'INT', 'MKT', 'ERP']

const SORT_OPTIONS = [
  { value: '', label: 'Sortuj…' },
  { value: 'date-asc', label: 'Termin ↑' },
  { value: 'date-desc', label: 'Termin ↓' },
  { value: 'name-asc', label: 'Nazwa A–Z' },
  { value: 'name-desc', label: 'Nazwa Z–A' },
]

interface ProjectFiltersProps {
  clients: { id: string; name: string }[]
  profiles?: { id: string; full_name: string | null }[]
  currentUserId?: string
}

export function ProjectFilters({ clients, profiles = [], currentUserId }: ProjectFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

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
  const currentSort = searchParams.get('sort') ?? ''
  const currentQ = searchParams.get('q') ?? ''
  const currentPm = searchParams.get('pm') ?? ''

  const setFilter = (key: string, value: string) => {
    const qs = createQueryString({ [key]: value })
    startTransition(() => {
      router.push(`${pathname}?${qs}`)
    })
  }

  // Debounce na search — czeka 300ms po ostatnim naciśnięciu zamiast nawigować per keystroke
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (value: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setFilter('q', value)
    }, 300)
  }

  const toggleAtRisk = () => {
    const qs = createQueryString({ atRisk: currentAtRisk ? '' : '1' })
    startTransition(() => {
      router.push(`${pathname}?${qs}`)
    })
  }

  const hasFilters = currentStatus || currentType || currentClient || currentAtRisk || currentSort || currentQ || currentPm

  const activeFilterCount = [currentStatus, currentType, currentClient, currentAtRisk ? '1' : '', currentSort, currentQ, currentPm].filter(Boolean).length

  const selectCls = 'h-7 rounded-full border border-border bg-background px-2.5 font-meta text-xs text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:border-teal/40'

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtry projektów">
      {/* Wyszukaj */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Szukaj projektu…"
          className="h-7 rounded-full border border-border bg-background pl-6 pr-2.5 font-meta text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 hover:border-teal/40 w-44"
          aria-label="Szukaj projektu po nazwie lub kliencie"
        />
      </div>

      {/* Status */}
      <select
        value={currentStatus}
        onChange={(e) => setFilter('status', e.target.value)}
        className={selectCls}
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
        className={selectCls}
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
          className={selectCls}
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

      {/* PM */}
      {profiles.length > 0 && (
        <select
          value={currentPm}
          onChange={(e) => setFilter('pm', e.target.value)}
          className={selectCls}
          aria-label="Filtruj według PM"
        >
          <option value="">Wszyscy PM</option>
          {currentUserId && (
            <option value="current">Moje projekty</option>
          )}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? p.id}
            </option>
          ))}
        </select>
      )}

      {/* Sortowanie */}
      <select
        value={currentSort}
        onChange={(e) => setFilter('sort', e.target.value)}
        className={selectCls}
        aria-label="Sortuj projekty"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

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
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Tylko zagrożone
      </button>

      {/* Wyczyść filtry */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              router.push(pathname)
            })
          }}
          className="h-7 rounded-full px-2.5 font-meta text-xs font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Wyczyść wszystkie filtry"
        >
          Filtry ({activeFilterCount}) × Wyczyść
        </button>
      )}
    </div>
  )
}
