import { ThemeToggle } from '@/components/theme-toggle'
import { logout } from '@/lib/actions/auth'
import type { SessionUser } from '@/lib/auth/dal'
import { LogOut } from 'lucide-react'

interface TopbarProps {
  user: SessionUser
  title?: string
}

export function Topbar({ user, title = 'Dashboard' }: TopbarProps) {
  const displayName = user.fullName ?? user.email ?? 'Użytkownik'

  return (
    <header className="sticky top-0 z-40 flex items-center h-14 border-b border-border bg-background px-4 gap-4">
      {/* Tytul sekcji / breadcrumb */}
      <div className="flex-1 min-w-0">
        <p className="font-sans font-semibold text-sm text-foreground truncate">
          {title}
        </p>
      </div>

      {/* Prawa strona: theme toggle + uzytkownik + wyloguj */}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />

        <div className="flex items-center gap-1.5 ml-1">
          <span className="font-meta text-xs text-muted-foreground hidden sm:block max-w-[140px] truncate">
            {displayName}
          </span>

          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Wyloguj się"
              title="Wyloguj się"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
