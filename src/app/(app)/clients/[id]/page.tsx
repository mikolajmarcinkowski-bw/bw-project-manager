import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectList } from '@/components/projects/project-list'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { getClientWithProjects } from '@/lib/data/projects'
import type { ProjectRowData } from '@/components/projects/project-row'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getClientWithProjects(id)
  const clientName = data?.client?.name
  if (!clientName) return { title: 'Klient · BW Project Manager' }
  return { title: `${clientName} · BW Project Manager` }
}

interface ClientPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ show?: string }>
}

export default async function ClientPage({ params, searchParams }: ClientPageProps) {
  const { id } = await params
  const { show } = await searchParams
  const data = await getClientWithProjects(id)

  if (!data || !data.client) {
    notFound()
  }

  const client = data.client
  const projects = data.projects ?? []

  // Mapowanie do ProjectRowData
  const projectRows: ProjectRowData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientId: client.id,
    clientName: client.name,
    status: p.status as 'active' | 'completed' | 'archived',
    types: p.types,
    startDate: p.startDate,
    endDate: p.endDate,
    atRisk: p.atRisk,
  }))

  const activeCount = projectRows.filter((p) => p.status === 'active').length
  const atRiskCount = projectRows.filter((p) => p.atRisk).length

  const showAll = show === 'all'
  const visibleRows = showAll ? projectRows : projectRows.filter((p) => p.status === 'active')

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek klienta */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {/* Breadcrumb */}
          <nav aria-label="Nawigacja okruszkowa">
            <Link
              href="/dashboard"
              className="font-meta text-xs text-teal-strong hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            >
              Teczki klientów
            </Link>
            <span className="font-meta text-xs text-muted-foreground mx-1.5" aria-hidden="true">/</span>
            <span className="font-meta text-xs text-muted-foreground" aria-current="page">
              {client.name}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{client.name}</h1>
            <EditClientDialog
              client={{
                id: client.id,
                name: client.name,
                nip: client.nip ?? null,
                hubspot_url: client.hubspot_url ?? null,
              }}
            />
          </div>

          {/* Metadane klienta */}
          <div className="flex flex-wrap items-center gap-3">
            {client.nip && (
              <span className="font-mono text-xs text-muted-foreground">
                NIP: {client.nip}
              </span>
            )}
            {client.hubspot_url && (
              <a
                href={client.hubspot_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-meta text-xs text-teal-strong hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
                aria-label="Otwórz rekord klienta w HubSpot (nowa karta)"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                HubSpot
              </a>
            )}
          </div>
        </div>

        {/* CTA: Dodaj projekt (Button z render prop jako Link) */}
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 rounded-full shrink-0"
          render={<Link href={`/projects/new?clientId=${client.id}`} />}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Dodaj projekt
        </Button>
      </div>

      {/* Statystyki */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 shadow-whisper">
          <span className="font-meta text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            Aktywne
          </span>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {activeCount}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 shadow-whisper">
          <span className="font-meta text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            Wszystkie
          </span>
          <span className="text-lg font-semibold text-foreground tabular-nums">
            {projectRows.length}
          </span>
        </div>
        {atRiskCount > 0 && (
          <div className="flex flex-col gap-0.5 rounded-lg border border-status-off/30 bg-status-off/5 px-4 py-3">
            <span className="font-meta text-[0.65rem] uppercase tracking-wide text-status-off/70">
              Zagrożone
            </span>
            <span className="text-lg font-semibold text-status-off tabular-nums">
              {atRiskCount}
            </span>
          </div>
        )}
      </div>

      {/* Lista projektów */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Projekty klienta</h2>
          {/* Toggle Aktywne / Wszystkie */}
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5 shadow-whisper" role="group" aria-label="Filtruj projekty">
            <Link
              href={`/clients/${id}`}
              className={[
                'font-meta text-xs px-3 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                !showAll
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              aria-current={!showAll ? 'true' : undefined}
            >
              Aktywne ({activeCount})
            </Link>
            <Link
              href={`/clients/${id}?show=all`}
              className={[
                'font-meta text-xs px-3 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                showAll
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              aria-current={showAll ? 'true' : undefined}
            >
              Wszystkie ({projectRows.length})
            </Link>
          </div>
        </div>
        <div className="rounded-[10px] border border-border bg-card shadow-whisper overflow-hidden">
          <ProjectList
            projects={visibleRows}
            showClient={false}
            emptyMessage={
              showAll
                ? 'Ten klient nie ma jeszcze żadnych projektów. Dodaj pierwszy przez przycisk powyżej.'
                : 'Brak aktywnych projektów. Przełącz na „Wszystkie" by zobaczyć archiwum.'
            }
          />
        </div>
      </div>
    </div>
  )
}
