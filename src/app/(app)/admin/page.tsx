import Link from 'next/link'
import { Users, UserCog, Shield } from 'lucide-react'

export const metadata = {
  title: 'Panel admina · BW Project Manager',
}

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Nagłówek */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-teal" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Panel admina</h1>
        </div>
        <p className="font-meta text-sm text-muted-foreground">
          Zarządzaj kontami użytkowników i pulą specjalistów.
        </p>
      </div>

      {/* Kafelki sekcji */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/admin/users"
          className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-whisper transition-colors hover:border-teal/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
              <Users className="h-4.5 w-4.5 text-teal" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-teal-strong transition-colors">
              Konta użytkowników
            </span>
          </div>
          <p className="font-meta text-xs text-muted-foreground leading-relaxed">
            PM-owie i administratorzy — twórz konta, zmieniaj role, dezaktywuj dostęp.
          </p>
          <span className="font-meta text-[0.68rem] uppercase tracking-wide text-teal font-semibold mt-auto">
            Zarządzaj →
          </span>
        </Link>

        <Link
          href="/admin/team"
          className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-whisper transition-colors hover:border-teal/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
              <UserCog className="h-4.5 w-4.5 text-teal" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-foreground group-hover:text-teal-strong transition-colors">
              Pula specjalistów
            </span>
          </div>
          <p className="font-meta text-xs text-muted-foreground leading-relaxed">
            Konsultanci BW bez kont — dodaj, dezaktywuj, monitoruj liczbę zadań i projektów.
          </p>
          <span className="font-meta text-[0.68rem] uppercase tracking-wide text-teal font-semibold mt-auto">
            Przeglądaj →
          </span>
        </Link>
      </div>
    </div>
  )
}
