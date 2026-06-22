import Link from 'next/link'
import { Users, Shield, FolderCog } from 'lucide-react'

export const metadata = {
  title: 'Panel admina · BW Project Manager',
}

const ADMIN_CARDS = [
  {
    href: '/admin/users',
    icon: Users,
    label: 'Konta użytkowników',
    description: 'PM-owie i administratorzy — twórz konta, zmieniaj role, dezaktywuj dostęp.',
    cta: 'Zarządzaj →',
  },
  {
    href: '/admin/team',
    icon: Users,
    label: 'Pula konsultantów',
    description: 'Konsultanci BW — bez kont, dostępni do przypisania do zadań i śledzenia alokacji.',
    cta: 'Przeglądaj →',
  },
  {
    href: '/admin/templates',
    icon: FolderCog,
    label: 'Szablony faz',
    description: 'Edytuj tytuły klocków i zadań szablonowych. Zmiany dotyczą nowych projektów.',
    cta: 'Edytuj →',
  },
]

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
        {ADMIN_CARDS.map(({ href, icon: Icon, label, description, cta }, index) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-whisper transition-all duration-200 hover:border-teal/40 hover:bg-muted/40 hover:-translate-y-px hover:shadow-whisper-md active:scale-[0.97] active:opacity-90 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:duration-500"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
                <Icon className="h-4.5 w-4.5 text-teal" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-teal-strong transition-colors">
                {label}
              </span>
            </div>
            <p className="font-meta text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
            <span className="font-meta text-[0.68rem] uppercase tracking-wide text-teal font-semibold mt-auto">
              {cta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
