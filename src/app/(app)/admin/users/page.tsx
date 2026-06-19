import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/dal'
import { AddUserDialog } from '@/components/admin/user-form'
import { UserRoleSelect, ToggleActiveButton, ResetPasswordButton } from '@/components/admin/user-actions'
import { Users, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Konta użytkowników · BW Project Manager',
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    dev_admin: { label: 'Dev Admin', className: 'bg-orange/15 text-orange border border-orange/30' },
    admin: { label: 'Admin', className: 'bg-teal/10 text-teal-strong border border-teal/30' },
    user: { label: 'Użytkownik', className: 'bg-muted text-muted-foreground border border-border' },
  }
  const { label, className } = map[role] ?? map.user
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium ${className}`}>
      {label}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-meta text-[0.68rem] font-medium ${
        active
          ? 'bg-teal/10 text-teal-strong border border-teal/30'
          : 'bg-status-off/10 text-status-off border border-status-off/30'
      }`}
    >
      {active ? 'Aktywny' : 'Nieaktywny'}
    </span>
  )
}

export default async function AdminUsersPage() {
  const sessionUser = await requireAdmin()  // P1-2: guard per-page
  const adminClient = createAdminClient()

  // Pobierz listę użytkowników z Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  })

  // Pobierz profile z bazy
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, role, is_active, is_tester, email')
    .order('full_name', { ascending: true })

  if (authError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-meta text-sm text-status-off">
          Błąd ładowania użytkowników: {authError.message}
        </p>
      </div>
    )
  }

  // Zbuduj mapę profil -> auth user
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  type EnrichedUser = {
    id: string
    email: string
    fullName: string | null
    role: string
    isActive: boolean
    isTester: boolean
    createdAt: string
  }

  const users: EnrichedUser[] = (authData?.users ?? []).map((u) => {
    const profile = profileMap.get(u.id)
    return {
      id: u.id,
      email: u.email ?? '',
      fullName: profile?.full_name ?? null,
      role: profile?.role ?? 'user',
      isActive: profile?.is_active ?? true,
      isTester: profile?.is_tester ?? false,
      createdAt: u.created_at,
    }
  })

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
            <Users className="h-5 w-5 text-teal" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">Konta użytkowników</h1>
          </div>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            {users.length} {users.length === 1 ? 'konto' : users.length < 5 ? 'konta' : 'kont'} łącznie
          </p>
        </div>
        <AddUserDialog />
      </div>

      {/* Tabela */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center flex flex-col items-center gap-4">
          <Users className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
          <p className="font-meta text-sm text-muted-foreground">Brak użytkowników. Dodaj pierwsze konto.</p>
          <AddUserDialog />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-whisper">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Lista kont użytkowników">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Użytkownik
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Rola
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tester
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const isSelf = user.id === sessionUser?.id
                  return (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      {/* Użytkownik */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground text-sm">
                            {user.fullName ?? '—'}
                            {isSelf && (
                              <span className="ml-1.5 font-meta text-[0.65rem] text-teal-strong">(Ty)</span>
                            )}
                          </span>
                          <span className="font-meta text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </td>

                      {/* Rola */}
                      <td className="px-4 py-3">
                        {user.role === 'dev_admin' ? (
                          <RoleBadge role="dev_admin" />
                        ) : (
                          <UserRoleSelect
                            userId={user.id}
                            currentRole={user.role as 'admin' | 'user' | 'dev_admin'}
                            isSelf={isSelf}
                          />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge active={user.isActive} />
                      </td>

                      {/* Tester */}
                      <td className="px-4 py-3">
                        <span className={`font-meta text-xs ${user.isTester ? 'text-teal-strong' : 'text-muted-foreground'}`}>
                          {user.isTester ? 'Tak' : 'Nie'}
                        </span>
                      </td>

                      {/* Akcje */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <ToggleActiveButton
                            userId={user.id}
                            isActive={user.isActive}
                            isSelf={isSelf}
                          />
                          <ResetPasswordButton userId={user.id} />
                        </div>
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
