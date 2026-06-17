import { Folder, FolderOpen } from 'lucide-react'
import { ClientCard } from '@/components/clients/client-card'
import { AddClientDialog } from '@/components/clients/add-client-dialog'
import { getClientsWithStats } from '@/lib/data/projects'

export const metadata = {
  title: 'Dashboard · BW Project Manager',
}

export default async function DashboardPage() {
  const clients = await getClientsWithStats()

  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const totalActive = clients.reduce((sum, c) => sum + c.activeCount, 0)
  const totalProjects = clients.reduce((sum, c) => sum + c.projectCount, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Teczki klientów</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-meta text-xs text-muted-foreground">
              Przeglądaj i zarządzaj projektami Delivery
            </p>
            <span className="font-meta text-[0.65rem] text-muted-foreground/40" aria-hidden="true">·</span>
            <time className="font-meta text-xs text-muted-foreground/70 capitalize" dateTime={new Date().toISOString().slice(0, 10)}>
              {today}
            </time>
          </div>
        </div>
        {clients.length > 0 && <AddClientDialog />}
      </div>

      {/* Lista teczek */}
      {clients.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Lista teczek klientów"
        >
          {clients.map((client, i) => (
            <ClientCard
              key={client.id}
              id={client.id}
              name={client.name}
              projectCount={client.projectCount}
              activeCount={client.activeCount}
              atRisk={client.atRisk}
              index={i}
            />
          ))}
        </div>
      ) : (
        /* Stan pusty — brandowy, zapraszający */
        <div className="flex flex-col items-center rounded-[10px] border border-dashed border-border bg-card py-14 px-8 shadow-whisper max-w-lg mx-auto w-full text-center">
          {/* Ikona folderu — duża, subtelna, teal */}
          <div className="relative mb-5 flex items-center justify-center">
            {/* Cień-halos pod ikoną */}
            <span
              className="absolute inset-0 rounded-full bg-teal/8 blur-xl"
              aria-hidden="true"
            />
            <Folder
              className="relative h-14 w-14 text-teal/40"
              strokeWidth={1.25}
              aria-hidden="true"
            />
            {/* Mały folder w tle — głębia */}
            <Folder
              className="absolute -bottom-1.5 -right-1.5 h-7 w-7 text-teal/20"
              strokeWidth={1}
              aria-hidden="true"
            />
          </div>

          {/* Eyebrow */}
          <span className="font-meta text-[0.7rem] uppercase tracking-widest text-teal-strong mb-2 block">
            Brak teczek
          </span>

          {/* Nagłówek */}
          <h2 className="text-base font-semibold text-foreground mb-2">
            Zacznij od pierwszego klienta
          </h2>

          {/* Opis */}
          <p className="font-meta text-sm text-muted-foreground leading-relaxed mb-6 max-w-[30ch] mx-auto">
            Teczka grupuje wszystkie projekty jednego klienta w jednym miejscu.
            Załóż ją ręcznie lub poproś Claude o setup przez MCP.
          </p>

          {/* Jedyna orange akcja */}
          <AddClientDialog />
        </div>
      )}

      {/* Podsumowanie: tylko gdy są klienci */}
      {clients.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5 text-teal" aria-hidden="true" />
            <span className="font-meta text-xs">
              {clients.length} {clients.length === 1 ? 'klient' : clients.length < 5 ? 'klienci' : 'klientów'}
            </span>
          </div>
          {totalActive > 0 && (
            <>
              <span className="font-meta text-[0.65rem] text-muted-foreground/40" aria-hidden="true">·</span>
              <span className="font-meta text-xs text-teal-strong">
                {totalActive} aktywnych
              </span>
            </>
          )}
          {totalProjects > 0 && (
            <>
              <span className="font-meta text-[0.65rem] text-muted-foreground/40" aria-hidden="true">·</span>
              <span className="font-meta text-xs text-muted-foreground">
                {totalProjects} projektów łącznie
              </span>
            </>
          )}
          {clients.some((c) => c.atRisk) && (
            <>
              <span className="font-meta text-[0.65rem] text-muted-foreground/40" aria-hidden="true">·</span>
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
