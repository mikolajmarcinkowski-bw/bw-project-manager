import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/auth/dal'
import { ToggleActiveButton, EditFullNameControl } from '@/components/admin/user-actions'
import { UserCog, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Pula specjalistów · BW Project Manager',
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    dev_admin: { label: 'dev_admin', className: 'bg-orange/15 text-orange border border-orange/30' },
    admin: { label: 'Admin', className: 'bg-teal/10 text-teal-strong border border-teal/30' },
    user: { label: 'PM / Użytkownik', className: 'bg-muted text-muted-foreground border border-border' },
  }
  const { label, className } = map[role] ?? map.user
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium ${className}`}>
      {label}
    </span>
  )
}

export default async function AdminTeamPage() {
  const adminClient = createAdminClient()
  const sessionUser = await getSessionUser()

  // Pobierz aktywne profile (pula specjalistów)
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, full_name, role, is_active, email')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-meta text-sm text-status-off">
          Błąd ładowania puli: {error.message}
        </p>
      </div>
    )
  }

  const members = profiles ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
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
          <h1 className="text-xl font-semibold text-foreground">Pula specjalistów</h1>
        </div>
        <p className="font-meta text-xs text-muted-foreground mt-0.5">
          Aktywne profile — widoczne przy przypisywaniu do projektów.
          {members.length > 0 && (
            <> {members.length} {members.length === 1 ? 'specjalista' : members.length < 5 ? 'specjalistów' : 'specjalistów'} aktywnych.</>
          )}
        </p>
      </div>

      {/* Info-box */}
      <div className="rounded-lg border border-teal/20 bg-teal/5 px-4 py-3">
        <p className="font-meta text-xs text-teal-strong leading-relaxed">
          Pula zarządzana przez konta użytkowników. Aby dodać specjalistę — utwórz konto w zakładce{' '}
          <Link href="/admin/users" className="underline underline-offset-2 hover:text-teal">
            Konta użytkowników
          </Link>
          . Dezaktywacja tutaj usuwa profil z puli.
        </p>
      </div>

      {/* Tabela */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <UserCog className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
          <p className="font-meta text-sm text-muted-foreground">
            Brak aktywnych profili w puli.{' '}
            <Link href="/admin/users" className="text-teal hover:underline">
              Dodaj użytkowników
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-whisper">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Pula specjalistów">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Specjalista
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Rola
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const isSelf = member.id === sessionUser?.id
                  return (
                    <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                      {/* Specjalista — inline edycja imienia */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <EditFullNameControl
                              userId={member.id}
                              currentName={member.full_name}
                            />
                            {isSelf && (
                              <span className="font-meta text-[0.65rem] text-teal-strong">(Ty)</span>
                            )}
                          </div>
                          {member.email && (
                            <span className="font-meta text-xs text-muted-foreground">{member.email}</span>
                          )}
                        </div>
                      </td>

                      {/* Rola */}
                      <td className="px-4 py-3">
                        <RoleBadge role={member.role} />
                      </td>

                      {/* Akcje */}
                      <td className="px-4 py-3">
                        <ToggleActiveButton
                          userId={member.id}
                          isActive={true}
                          isSelf={isSelf}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
