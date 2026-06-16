'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'
import { Logo } from '@/components/brand/logo'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 min-h-screen bg-sidebar border-r border-sidebar-border"
      aria-label="Nawigacja główna"
    >
      {/* Logotyp */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        <Logo className="h-6" />
      </div>

      {/* Nawigacja */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1" aria-label="Menu">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard' || pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-muted text-teal-strong'
                  : 'text-sidebar-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors duration-150',
                  isActive ? 'text-teal' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Dolna stopka sidebara */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="font-meta text-[0.7rem] text-muted-foreground">
          Tylko do użytku wewnętrznego
        </p>
      </div>
    </aside>
  )
}
