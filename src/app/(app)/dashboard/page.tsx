import { FolderOpen } from 'lucide-react'
import { ClientCard } from '@/components/clients/client-card'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { getClientsWithStats } from '@/lib/data/projects'

export const metadata = {
  title: 'Dashboard · BW Project Manager',
}

export default async function DashboardPage() {
  const clients = await getClientsWithStats()

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Teczki klientów</h1>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            Przeglądaj i zarządzaj projektami Delivery
          </p>
        </div>
        {clients.length > 0 && <AddClientDialog />}
      </div>

      {/* Lista teczek */}
      {clients.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Lista teczek klientów"
        >
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              id={client.id}
              name={client.name}
              projectCount={client.projectCount}
              activeCount={client.activeCount}
              atRisk={client.atRisk}
            />
          ))}
        </div>
      ) : (
        /* Stan pusty */
        <div className="flex flex-col items-start rounded-[10px] border border-border bg-card py-8 px-8 max-w-xl shadow-whisper">
          <span className="font-meta text-[0.7rem] uppercase tracking-wide text-teal mb-2">
            Pierwsze kroki
          </span>
          <h2 className="text-base font-semibold text-foreground mb-1.5">
            Brak skonfigurowanych teczek
          </h2>
          <p className="font-meta text-sm text-muted-foreground leading-relaxed mb-5">
            Teczka grupuje projekty jednego klienta. Załóż pierwszą ręcznie albo poproś
            Claude o setup projektu przez MCP. Pojawi się tutaj automatycznie.
          </p>
          <AddClientDialog />
        </div>
      )}

      {/* Podsumowanie: tylko gdy są klienci */}
      {clients.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-meta text-xs">
              {clients.length} {clients.length === 1 ? 'klient' : clients.length < 5 ? 'klienci' : 'klientów'}
            </span>
          </div>
          {clients.some((c) => c.atRisk) && (
            <>
              <span className="font-meta text-[0.65rem] text-muted-foreground/40">·</span>
              <span className="font-meta text-xs text-status-off">
                {clients.filter((c) => c.atRisk).length} zagrożonych
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
