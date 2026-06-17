import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-4">
      <span className="font-mono text-5xl font-bold text-muted-foreground/30">404</span>
      <h1 className="text-xl font-semibold text-foreground">Nie znaleziono strony</h1>
      <p className="font-meta text-sm text-muted-foreground max-w-sm">
        Zasób, którego szukasz, nie istnieje lub został usunięty.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-teal/10 text-teal-strong border border-teal/30 hover:bg-teal/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        Wróć do dashboardu
      </Link>
    </div>
  )
}
