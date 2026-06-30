'use client'

import { useState, useTransition } from 'react'
import { Sparkles, AlertTriangle, ChevronRight, Loader2, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { analyzePortfolio, type AiPortfolioAnalysis } from '@/lib/actions/ai'

export function DashboardAiWidget() {
  const [analysis, setAnalysis] = useState<AiPortfolioAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAnalyze() {
    setError(null)
    startTransition(async () => {
      const result = await analyzePortfolio()
      if ('error' in result) {
        setError(result.error)
      } else {
        setAnalysis(result.data)
      }
    })
  }

  function handleReset() {
    setAnalysis(null)
    setError(null)
  }

  // Stan: nie analizowany jeszcze
  if (!analysis && !error && !isPending) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-teal shrink-0" aria-hidden />
          <span className="font-meta text-sm text-foreground/80">
            Analiza AI portfela
          </span>
          <span className="font-meta text-xs text-muted-foreground">
            — GPT-4o Mini przejrzy stan projektów i zaproponuje priorytety
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          className="shrink-0 active:scale-[0.97] active:opacity-90 focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1"
          aria-label="Uruchom analizę AI portfela projektów"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Analizuj portfel
        </Button>
      </div>
    )
  }

  // Stan: ładowanie
  if (isPending) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <Loader2 className="w-4 h-4 text-teal animate-spin shrink-0" aria-hidden />
        <span className="font-meta text-sm text-muted-foreground">
          Analizuję portfel projektów…
        </span>
      </div>
    )
  }

  // Stan: błąd
  if (error) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[#E24B4A]/20 bg-[#FCEBEB] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#A32D2D] shrink-0" aria-hidden />
          <span className="font-meta text-sm text-[#A32D2D]">{error}</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 rounded text-[#A32D2D]/60 hover:text-[#A32D2D] transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E24B4A]"
          aria-label="Zamknij błąd"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // Stan: wyniki
  if (!analysis) return null

  return (
    <div className={cn(
      'rounded-lg border border-teal/20 bg-card overflow-hidden',
      'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal shrink-0" aria-hidden />
          <span className="font-heading font-semibold text-sm text-foreground">Analiza AI portfela</span>
          <span className="font-meta text-[0.65rem] text-muted-foreground/60 uppercase tracking-wide">GPT-4o Mini</span>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isPending}
          className="inline-flex items-center gap-1 font-meta text-xs text-muted-foreground hover:text-teal transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded px-1.5 py-1"
          aria-label="Odśwież analizę"
        >
          <RefreshCw className="w-3 h-3" />
          Odśwież
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Podsumowanie */}
        <p className="font-meta text-sm text-foreground/90 leading-relaxed">
          {analysis.summary}
        </p>

        {/* Alerty */}
        {analysis.alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-meta text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">
              Wymagające działania
            </span>
            {analysis.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border border-[#E24B4A]/15 bg-[#FCEBEB]/60 px-3 py-2.5',
                  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-1',
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-off shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <p className="font-meta text-xs font-semibold text-foreground">{alert.project}</p>
                    <p className="font-meta text-xs text-muted-foreground mt-0.5">{alert.issue}</p>
                    <p className="font-meta text-xs text-status-off mt-1 font-medium">{alert.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Priorytety */}
        {analysis.priorities.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-meta text-[0.65rem] uppercase tracking-wide text-muted-foreground/60">
              Priorytety na dziś
            </span>
            {analysis.priorities.map((priority, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2.5',
                  'motion-safe:animate-in motion-safe:fade-in',
                )}
                style={{ animationDelay: `${(analysis.alerts.length + i) * 60}ms` }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-teal shrink-0 mt-0.5" aria-hidden />
                <span className="font-meta text-xs text-foreground/80">{priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
