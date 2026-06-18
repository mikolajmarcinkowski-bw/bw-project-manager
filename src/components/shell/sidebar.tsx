'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from './nav-items'
import { Logo } from '@/components/brand/logo'
import { Clock, Shield } from 'lucide-react'
import type { UserRole } from '@/lib/auth/dal'

export interface RecentProject {
  id: string
  name: string
  clientName: string
}

const RECENT_PROJECTS_KEY = 'bw-recent-projects'
const MAX_RECENT = 3

function RecentProjects() {
  const [recent, setRecent] = useState<RecentProject[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PROJECTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RecentProject[]
        setRecent(parsed.slice(0, MAX_RECENT))
      }
    } catch {
      // localStorage unavailable or invalid JSON — ignore
    }
  }, [])

  if (recent.length === 0) return null

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
        <span className="font-meta text-[0.68rem] uppercase tracking-wide text-muted-foreground font-semibold">
          Ostatnie
        </span>
      </div>
      {recent.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="group flex flex-col gap-0 rounded-md px-2.5 py-1.5 transition-colors duration-150 text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <span className="text-xs font-medium truncate leading-tight">
            {project.name}
          </span>
          <span className="font-meta text-[0.68rem] text-muted-foreground truncate">
            {project.clientName}
          </span>
        </Link>
      ))}
    </div>
  )
}

interface SidebarProps {
  userRole?: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === 'admin' || userRole === 'dev_admin'

  return (
    <aside
      className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 overflow-y-auto bg-sidebar border-r border-sidebar-border"
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

        {/* Separator przed "Ostatnie" */}
        <div className="my-1.5 border-t border-sidebar-border" role="separator" />

        <RecentProjects />

        {/* Sekcja Admin — widoczna tylko dla admin/dev_admin */}
        {isAdmin && (
          <>
            <div className="my-1.5 border-t border-sidebar-border" role="separator" />
            <div className="px-2 pb-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
                <Shield className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="font-meta text-[0.68rem] uppercase tracking-wide text-muted-foreground font-semibold">
                  Admin
                </span>
              </div>
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)
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
            </div>
          </>
        )}
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
