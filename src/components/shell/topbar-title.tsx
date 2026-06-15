'use client'

import { usePathname } from 'next/navigation'

// Mapa tras → tytuł sekcji w górnym pasku. Dynamiczne segmenty dostają tytuł ogólny.
function titleForPath(path: string): string {
  if (path === '/dashboard' || path === '/') return 'Dashboard'
  if (path === '/projekty') return 'Wszystkie projekty'
  if (path === '/projects/new') return 'Nowy projekt'
  if (path.startsWith('/clients/')) return 'Klient'
  if (path.startsWith('/projects/')) return 'Projekt'
  if (path === '/archiwum') return 'Archiwum'
  return 'BW Project Manager'
}

export function TopbarTitle() {
  const pathname = usePathname()
  return (
    <p className="font-sans font-semibold text-sm text-foreground truncate">
      {titleForPath(pathname)}
    </p>
  )
}
