import Link from 'next/link'
import { Archive } from 'lucide-react'

export const metadata = {
  title: 'Archiwum · BW Project Manager',
}

export default function ArchiwumPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Archiwum</h1>
        <p className="font-meta text-xs text-muted-foreground mt-0.5">
          Zarchiwizowane projekty z pełną historią
        </p>
      </div>

      <div className="flex flex-col items-start rounded-lg border border-dashed border-border bg-card py-10 px-8 max-w-xl shadow-whisper">
        <Archive className="h-8 w-8 text-muted-foreground/40 mb-3" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground mb-1">Wkrótce</h2>
        <p className="font-meta text-sm text-muted-foreground leading-relaxed">
          Widok archiwum (lustrzany układ klient → zarchiwizowane projekty, read-only)
          pojawi się razem z archiwizacją projektów. Na razie aktywne projekty znajdziesz
          na dashboardzie i w widoku wszystkich projektów.
        </p>
        <Link
          href="/projekty"
          className="mt-4 font-meta text-sm text-teal-strong hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
        >
          → Przejdź do aktywnych projektów
        </Link>
      </div>
    </div>
  )
}
