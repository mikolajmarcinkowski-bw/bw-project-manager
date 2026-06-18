import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export const metadata = { title: 'Brak dostępu · BW Project Manager' }

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center bg-background">
      <ShieldAlert className="h-12 w-12 text-status-off/60" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-foreground">Brak dostępu</h1>
      <p className="font-meta text-sm text-muted-foreground max-w-sm">
        Nie masz uprawnień do tej sekcji. Skontaktuj się z administratorem.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold bg-teal/10 text-teal-strong border border-teal/30 hover:bg-teal/20 transition-colors"
      >
        Wróć do dashboardu
      </Link>
    </div>
  )
}
