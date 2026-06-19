import { getAllSpecialistsWithAllocation } from '@/lib/data/specialists'
import { requireAdmin } from '@/lib/auth/dal'
import {
  EditSpecialistNameControl,
  ToggleSpecialistButton,
  AddSpecialistDialog,
} from '@/components/admin/specialist-actions'
import { UserCog, ChevronLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Pula konsultantów · BW Project Manager',
}

function pluralKonsultant(count: number): string {
  if (count === 1) return 'konsultant'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'konsultanci'
  return 'konsultantów'
}

export default async function AdminTeamPage() {
  await requireAdmin()

  const specialists = await getAllSpecialistsWithAllocation()

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="flex items-center gap-1 font-meta text-xs text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Wróć do panelu admina"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Panel admina
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-teal" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">Pula konsultantów</h1>
          </div>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            {specialists.length > 0 ? (
              <>
                {`${specialists.length} ${pluralKonsultant(specialists.length)} w puli`} &mdash; zarządzaj listą i statusami.
              </>
            ) : (
              'Dodaj konsultantów, aby móc przypisywać ich do zadań.'
            )}
          </p>
        </div>

        {/* Przycisk dodawania — zawsze widoczny */}
        <AddSpecialistDialog>
          <Button
            size="sm"
            className="gap-1.5 rounded-md h-8 px-3 bg-teal text-white hover:bg-teal-strong text-xs font-medium"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Dodaj konsultanta
          </Button>
        </AddSpecialistDialog>
      </div>

      {/* Tabela lub pusty stan */}
      {specialists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center flex flex-col items-center gap-3">
          <UserCog className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-meta text-sm font-medium text-muted-foreground">
              Brak konsultantów w puli.
            </p>
            <p className="font-meta text-xs text-muted-foreground/70">
              Dodaj pierwszego konsultanta, aby móc przypisywać go do zadań.
            </p>
          </div>
          <AddSpecialistDialog>
            <Button
              size="sm"
              className="gap-1.5 rounded-md h-8 px-3 bg-teal text-white hover:bg-teal-strong text-xs font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Dodaj konsultanta
            </Button>
          </AddSpecialistDialog>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-whisper">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Pula konsultantów">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Konsultant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    title="Aktywne zadania przypisane do tego konsultanta"
                  >
                    Zadania
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    title="Aktywne projekty w których konsultant ma przypisane zadania"
                  >
                    Projekty
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {specialists.map((specialist) => (
                  <tr key={specialist.id} className="hover:bg-muted/20 transition-colors">
                    {/* Konsultant — inline edycja */}
                    <td className="px-4 py-3">
                      <EditSpecialistNameControl
                        specialistId={specialist.id}
                        currentName={specialist.full_name}
                      />
                    </td>

                    {/* Zadania */}
                    <td className="px-4 py-3">
                      {specialist.active_tasks > 0 ? (
                        <span className="text-muted-foreground font-mono text-sm">
                          {specialist.active_tasks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-sm">
                          &mdash;
                        </span>
                      )}
                    </td>

                    {/* Projekty */}
                    <td className="px-4 py-3">
                      {specialist.active_projects > 0 ? (
                        <span className="text-muted-foreground font-mono text-sm">
                          {specialist.active_projects}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-mono text-sm">
                          &mdash;
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {specialist.is_active ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium bg-teal/10 text-teal border border-teal/30"
                        >
                          Aktywny
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium bg-muted text-status-off border border-border"
                        >
                          Nieaktywny
                        </span>
                      )}
                    </td>

                    {/* Akcje */}
                    <td className="px-4 py-3">
                      <ToggleSpecialistButton
                        specialistId={specialist.id}
                        isActive={specialist.is_active}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
