'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Mapa tras → tytuł sekcji w górnym pasku. Dynamiczne segmenty dostają tytuł ogólny.
function titleForPath(path: string, pmParam: string | null): string {
  if (path === '/dashboard' || path === '/') return 'Dashboard'
  if (path === '/projekty' && pmParam === 'current') return 'Moje projekty'
  if (path === '/projekty') return 'Wszystkie projekty'
  if (path === '/projects/new') return 'Nowy projekt'
  if (path.startsWith('/clients/')) return 'Teczka klienta'
  if (path.startsWith('/projects/')) return 'Projekt'
  if (path === '/archiwum') return 'Archiwum'
  return 'BW Project Manager'
}

function TopbarTitleInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pmParam = searchParams.get('pm')
  return (
    <p className="font-sans font-semibold text-sm text-foreground truncate">
      {titleForPath(pathname, pmParam)}
    </p>
  )
}

export function TopbarTitle() {
  return (
    <Suspense
      fallback={
        <p className="font-sans font-semibold text-sm text-foreground truncate">
          BW Project Manager
        </p>
      }
    >
      <TopbarTitleInner />
    </Suspense>
  )
}
