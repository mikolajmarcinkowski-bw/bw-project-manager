import Link from 'next/link'
import { AddProjectForm } from '@/components/projects/add-project-form'
import { getClientsWithStats, getProfiles } from '@/lib/data/projects'

export const metadata = {
  title: 'Nowy projekt · BW Project Manager',
}

interface NewProjectPageProps {
  searchParams: Promise<{ clientId?: string }>
}

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { clientId } = await searchParams

  const [clientStats, profiles] = await Promise.all([
    getClientsWithStats(),
    getProfiles(),
  ])

  const clients = clientStats.map((c) => ({ id: c.id, name: c.name }))
  // Filtruj profile bez pełnego imienia (null safety)
  const safeProfiles = profiles
    .filter((p): p is typeof p & { full_name: string } => p.full_name !== null)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Nagłówek z breadcrumb */}
      <div className="flex flex-col gap-1.5">
        <nav aria-label="Nawigacja okruszkowa">
          {clientId ? (
            <>
              <Link
                href="/dashboard"
                className="font-meta text-xs text-teal hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Teczki klientów
              </Link>
              <span className="font-meta text-xs text-muted-foreground mx-1.5" aria-hidden="true">/</span>
              <Link
                href={`/clients/${clientId}`}
                className="font-meta text-xs text-teal hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {clients.find((c) => c.id === clientId)?.name ?? 'Klient'}
              </Link>
              <span className="font-meta text-xs text-muted-foreground mx-1.5" aria-hidden="true">/</span>
              <span className="font-meta text-xs text-muted-foreground" aria-current="page">
                Nowy projekt
              </span>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="font-meta text-xs text-teal hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Dashboard
              </Link>
              <span className="font-meta text-xs text-muted-foreground mx-1.5" aria-hidden="true">/</span>
              <span className="font-meta text-xs text-muted-foreground" aria-current="page">
                Nowy projekt
              </span>
            </>
          )}
        </nav>

        <h1 className="text-xl font-semibold text-foreground">Nowy projekt</h1>
        <p className="font-meta text-xs text-muted-foreground">
          Wypełnij dane projektu. Pola oznaczone{' '}
          <span className="text-status-off" aria-hidden="true">*</span>{' '}
          są wymagane.
        </p>
      </div>

      {/* Formularz */}
      <div className="rounded-[10px] border border-border bg-card shadow-whisper px-6 py-5">
        <AddProjectForm
          clients={clients}
          profiles={safeProfiles}
          defaultClientId={clientId}
        />
      </div>
    </div>
  )
}
