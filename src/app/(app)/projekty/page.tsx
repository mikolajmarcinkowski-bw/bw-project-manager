import { Suspense } from 'react'
import Link from 'next/link'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectList } from '@/components/projects/project-list'
import { ProjectFilters } from '@/components/projects/project-filters'
import { getAllProjects, getClientsBasic, getProfiles } from '@/lib/data/projects'
import { requireUser } from '@/lib/auth/dal'
import type { ImplType } from '@/lib/data/projects'

export const metadata = {
  title: 'Wszystkie projekty · BW Project Manager',
}

interface ProjektyPageProps {
  searchParams: Promise<{
    status?: string
    type?: string
    client?: string
    atRisk?: string
    q?: string
    sort?: string
    pm?: string
  }>
}

export default async function ProjektyPage({ searchParams }: ProjektyPageProps) {
  const params = await searchParams

  // Resolve PM filter: 'current' → logged-in user id
  const currentUser = await requireUser()
  const resolvedPmId = params.pm === 'current' ? currentUser.id : params.pm

  const [allProjects, clients, profiles] = await Promise.all([
    getAllProjects({ pmId: resolvedPmId || undefined }),
    getClientsBasic(),   // 1 query zamiast 4 (bez duplikatu getAllProjects)
    getProfiles(),
  ])

  // Filtrowanie po stronie serwera (status / type / client / atRisk / search)
  const filtered = allProjects.filter((p) => {
    if (params.status && p.status !== params.status) return false
    if (params.type && !p.types.includes(params.type as ImplType)) return false
    if (params.client && p.clientId !== params.client) return false
    if (params.atRisk === '1' && !p.atRisk) return false
    if (params.q) {
      const q = params.q.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.clientName.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Sortowanie
  const sort = params.sort ?? ''
  if (sort) {
    filtered.sort((a, b) => {
      switch (sort) {
        case 'date-asc': {
          // null last
          if (!a.endDate && !b.endDate) return 0
          if (!a.endDate) return 1
          if (!b.endDate) return -1
          return a.endDate.localeCompare(b.endDate)
        }
        case 'date-desc': {
          // null first
          if (!a.endDate && !b.endDate) return 0
          if (!a.endDate) return -1
          if (!b.endDate) return 1
          return b.endDate.localeCompare(a.endDate)
        }
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pl')
        case 'name-desc':
          return b.name.localeCompare(a.name, 'pl')
        default:
          return 0
      }
    })
  }

  const hasFilters = !!(params.status || params.type || params.client || params.atRisk || params.q || params.pm || sort)
  const atRiskCount = filtered.filter((p) => p.atRisk).length

  const clientsForFilter = clients

  return (
    <div className="flex flex-col gap-5">
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Wszystkie projekty</h1>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            Widok cross-klientowy wszystkich wdrożeń Delivery
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {atRiskCount > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-full border border-status-off/30 bg-status-off/5 px-3 py-1"
              aria-live="polite"
              aria-label={`${atRiskCount} projektów zagrożonych`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-status-off" aria-hidden="true" />
              <span className="font-meta text-xs text-status-off font-medium">
                {atRiskCount} {atRiskCount === 1 ? 'zagrożony' : 'zagrożonych'}
              </span>
            </div>
          )}
          <Button size="sm" className="gap-1.5 rounded-full" render={<Link href="/projects/new" />}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Dodaj projekt
          </Button>
        </div>
      </div>

      {/* Filtry */}
      <Suspense fallback={null}>
        <ProjectFilters
          clients={clientsForFilter}
          profiles={profiles}
          currentUserId={currentUser.id}
        />
      </Suspense>

      {/* Wyniki */}
      <div className="rounded-[10px] border border-border bg-card shadow-whisper overflow-hidden">
        {/* Nagłówek tabeli */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-2 bg-muted/40">
          <span className="flex-1 font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            Projekt
          </span>
          <span className="shrink-0 w-20 font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground text-center">
            Status
          </span>
          <span className="hidden sm:block shrink-0 font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            Typy
          </span>
          <span className="hidden md:block shrink-0 min-w-[110px] font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground text-right">
            Daty
          </span>
        </div>

        <ProjectList
          projects={filtered.map((p) => ({ ...p, status: p.status as 'active' | 'completed' | 'archived' }))}
          showClient
          emptyMessage={
            hasFilters
              ? 'Żaden projekt nie pasuje do wybranych filtrów.'
              : 'Brak projektów w systemie.'
          }
        />
      </div>

      {/* Licznik */}
      <p className="font-meta text-xs text-muted-foreground">
        {filtered.length === allProjects.length
          ? `${allProjects.length} ${allProjects.length === 1 ? 'projekt' : 'projektów'} łącznie`
          : `${filtered.length} z ${allProjects.length} projektów`}
      </p>
    </div>
  )
}
