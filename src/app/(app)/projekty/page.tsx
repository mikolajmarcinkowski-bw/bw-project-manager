import { Suspense } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ProjectList } from '@/components/projects/project-list'
import { ProjectFilters } from '@/components/projects/project-filters'
import { getAllProjects, getClientsWithStats } from '@/lib/data/projects'
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
  }>
}

export default async function ProjektyPage({ searchParams }: ProjektyPageProps) {
  const params = await searchParams

  const [allProjects, clients] = await Promise.all([
    getAllProjects(),
    getClientsWithStats(),
  ])

  // Filtrowanie po stronie serwera
  const filtered = allProjects.filter((p) => {
    if (params.status && p.status !== params.status) return false
    if (params.type && !p.types.includes(params.type as ImplType)) return false
    if (params.client && p.clientId !== params.client) return false
    if (params.atRisk === '1' && !p.atRisk) return false
    return true
  })

  const hasFilters = !!(params.status || params.type || params.client || params.atRisk)
  const atRiskCount = filtered.filter((p) => p.atRisk).length

  const clientsForFilter = clients.map((c) => ({ id: c.id, name: c.name }))

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
      </div>

      {/* Filtry */}
      <Suspense fallback={null}>
        <ProjectFilters clients={clientsForFilter} />
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
          linkDisabled
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
