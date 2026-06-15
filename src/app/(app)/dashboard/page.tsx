import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata = {
  title: 'Dashboard · BW Project Manager',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Naglowek (bez akcji — jedyne CTA jest w stanie pustym, gdy nie ma jeszcze teczek) */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Teczki klientów</h1>
        <p className="font-meta text-xs text-muted-foreground mt-0.5">
          Przeglądaj i zarządzaj projektami Delivery
        </p>
      </div>

      {/* Stan pusty (konfiguracja — widoczny zanim powstaną pierwsze teczki) */}
      <div className="flex flex-col items-start rounded-lg border border-border bg-card py-8 px-8 max-w-xl shadow-whisper">
        <span className="font-meta text-[0.7rem] uppercase tracking-wide text-teal mb-2">
          Pierwsze kroki
        </span>
        <h2 className="text-base font-semibold text-foreground mb-1.5">
          Brak skonfigurowanych teczek
        </h2>
        <p className="font-meta text-sm text-muted-foreground leading-relaxed mb-5">
          Teczka grupuje projekty jednego klienta. Załóż pierwszą ręcznie albo poproś
          Claude o setup projektu (przez MCP) — pojawi się tutaj automatycznie.
        </p>
        <Button variant="default" size="sm" className="gap-1.5 rounded-full">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Dodaj klienta
        </Button>
      </div>
    </div>
  )
}
