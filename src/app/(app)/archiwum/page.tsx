import Link from 'next/link'
import { Archive } from 'lucide-react'
import { ImplTypeBadge } from '@/components/projects/impl-type-badge'
import { ProjectStatusBadge } from '@/components/projects/project-status-badge'
import { getArchivedProjects } from '@/lib/data/projects'

export const metadata = {
  title: 'Archiwum projektów · BW Project Manager',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export default async function ArchiwumPage() {
  const projects = await getArchivedProjects()

  return (
    <div className="flex flex-col gap-5">
      {/* Nagłówek */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Archiwum projektów
          {projects.length > 0 && (
            <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
              ({projects.length})
            </span>
          )}
        </h1>
        <p className="font-meta text-xs text-muted-foreground mt-0.5">
          Zarchiwizowane projekty — tryb tylko do odczytu
        </p>
      </div>

      {projects.length === 0 ? (
        /* Stan pusty */
        <div className="flex flex-col items-start rounded-lg border border-dashed border-border bg-card py-10 px-8 max-w-xl shadow-whisper">
          <Archive className="h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground mb-1">Brak zarchiwizowanych projektów</h2>
          <p className="font-meta text-sm text-muted-foreground leading-relaxed">
            Zarchiwizowane projekty pojawią się tutaj po oznaczeniu ich jako zakończone
            i przeprowadzeniu archiwizacji ze strony projektu.
          </p>
          <Link
            href="/projekty"
            className="mt-4 font-meta text-sm text-teal-strong hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
          >
            Przejdź do aktywnych projektów
          </Link>
        </div>
      ) : (
        /* Tabela archiwum */
        <div className="rounded-[10px] border border-border bg-card shadow-whisper overflow-hidden">
          {/* Nagłówek kolumn */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-3 py-2 bg-muted/40">
            <span className="font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Projekt
            </span>
            <span className="hidden sm:block font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Typy
            </span>
            <span className="hidden md:block font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              Daty projektu
            </span>
            <span className="font-meta text-[0.7rem] uppercase tracking-wide text-muted-foreground text-right whitespace-nowrap">
              Zarchiwizowano
            </span>
          </div>

          {/* Wiersze */}
          <div className="flex flex-col divide-y divide-border/60">
            {projects.map((project, i) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                aria-label={`Projekt zarchiwizowany: ${project.name}`}
                className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-inset motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
                style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}
              >
                {/* Nazwa + klient */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate transition-colors group-hover:text-teal-strong">
                      {project.name}
                    </span>
                    <ProjectStatusBadge status="archived" />
                  </div>
                  <span className="font-meta text-xs text-muted-foreground truncate">
                    {project.clientName}
                  </span>
                </div>

                {/* Typy */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {project.types.map((t) => (
                    <ImplTypeBadge key={t} type={t} />
                  ))}
                </div>

                {/* Daty projektu */}
                <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[100px]">
                  {project.startDate && (
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      {formatDate(project.startDate)}
                    </span>
                  )}
                  {project.endDate && (
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      &rarr; {formatDate(project.endDate)}
                    </span>
                  )}
                </div>

                {/* Zarchiwizowano */}
                <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[120px]">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {formatDate(project.archivedAt)}
                  </span>
                  {project.archivedByName && (
                    <span className="font-meta text-[0.65rem] text-muted-foreground/70 truncate max-w-[120px]">
                      przez {project.archivedByName}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Licznik */}
      {projects.length > 0 && (
        <p className="font-meta text-xs text-muted-foreground">
          {projects.length} {projects.length === 1 ? 'projekt zarchiwizowany' : 'projektów zarchiwizowanych'}
        </p>
      )}
    </div>
  )
}
