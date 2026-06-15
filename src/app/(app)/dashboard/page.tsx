import { Button } from '@/components/ui/button'
import { FolderOpen, Plus } from 'lucide-react'

export const metadata = {
  title: 'Dashboard · BW Project Manager',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Naglowek z akcja */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Teczki klientow</h1>
          <p className="font-meta text-xs text-muted-foreground mt-0.5">
            Przegladaj i zarzadzaj projektami Delivery
          </p>
        </div>

        {/* Akcja naglowkowa — outline, orange zarezerwowany dla CTA stanu pustego */}
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Dodaj klienta
        </Button>
      </div>

      {/* Stan pusty */}
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 px-8 text-center shadow-whisper">
        <FolderOpen
          className="h-10 w-10 text-muted-foreground/50 mb-4"
          aria-hidden="true"
        />
        <h2 className="text-base font-semibold text-foreground mb-1">
          Brak projektow
        </h2>
        <p className="font-meta text-sm text-muted-foreground max-w-xs">
          Nie masz jeszcze zadnych projektow. Zacznij od dodania pierwszego klienta.
        </p>
        <Button variant="default" size="sm" className="mt-5 gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Dodaj klienta
        </Button>
      </div>
    </div>
  )
}
