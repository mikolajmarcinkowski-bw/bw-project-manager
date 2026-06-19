// Server Component — brak 'use client', brak useState/useEffect.
// Wyświetla dzienny briefing PM-a na dashboardzie (D-R1).

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Flame,
  LayoutDashboard,
} from 'lucide-react'
import type { DashboardBriefData } from '@/lib/data/projects'

interface DashboardBriefingProps {
  data: DashboardBriefData
}

function formatDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  })
}

const MAX_ITEMS = 5

export function DashboardBriefing({ data }: DashboardBriefingProps) {
  const { atRiskProjects, tasksDueToday, tasksDueSoon, burnAlerts } = data

  const hasItems =
    atRiskProjects.length > 0 ||
    tasksDueToday.length > 0 ||
    tasksDueSoon.length > 0 ||
    burnAlerts.length > 0

  // Stan spokoju — wszystko pod kontrolą
  if (!hasItems) {
    return (
      <div
        className="flex items-center gap-2.5 bg-teal/5 border border-teal/20 rounded-xl px-4 py-3"
        role="status"
        aria-label="Brak pilnych spraw"
      >
        <CheckCircle2 className="h-4 w-4 text-teal shrink-0" aria-hidden="true" />
        <span className="font-meta text-sm text-teal">
          Wszystko pod kontrolą — brak pilnych spraw.
        </span>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-whisper p-4 flex flex-col gap-4"
      aria-label="Podsumowanie dnia"
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 font-heading font-semibold text-sm text-foreground leading-snug">
          <LayoutDashboard className="h-4 w-4 text-teal shrink-0" aria-hidden="true" />
          Podsumowanie dnia
        </h2>
        <time
          className="font-meta text-xs text-muted-foreground capitalize shrink-0"
          dateTime={new Date().toISOString().slice(0, 10)}
        >
          {today}
        </time>
      </div>

      {/* Chipsy statystyk */}
      <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Statystyki dnia">
        {atRiskProjects.length > 0 && (
          <span
            role="listitem"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-meta text-xs bg-status-off/10 text-status-off border border-status-off/30"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            {atRiskProjects.length} zagrożone
          </span>
        )}

        {tasksDueToday.length > 0 && (
          <span
            role="listitem"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-meta text-xs bg-status-at/10 text-status-at border border-status-at/30"
          >
            <ClipboardList className="h-3 w-3 shrink-0" aria-hidden="true" />
            {tasksDueToday.length} dziś
          </span>
        )}

        {tasksDueSoon.length > 0 && (
          <span
            role="listitem"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-meta text-xs bg-muted text-muted-foreground border border-border"
          >
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {tasksDueSoon.length} wkrótce
          </span>
        )}

        {burnAlerts.length > 0 && (
          <span
            role="listitem"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-meta text-xs bg-status-off/10 text-status-off border border-status-off/30"
          >
            <Flame className="h-3 w-3 shrink-0" aria-hidden="true" />
            {burnAlerts.length} burn
          </span>
        )}
      </div>

      {/* Sekcje — tylko gdy niepuste */}
      <div className="divide-y divide-border/50 flex flex-col">

        {/* Zagrożone projekty */}
        {atRiskProjects.length > 0 && (
          <section className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2" aria-labelledby="section-risk">
            <h3
              id="section-risk"
              className="font-meta text-xs font-semibold text-status-off flex items-center gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Zagrożone projekty ({atRiskProjects.length})
            </h3>
            <ul className="flex flex-col gap-1" role="list">
              {atRiskProjects.slice(0, MAX_ITEMS).map((p, i) => (
                <li key={i} className="font-meta text-sm text-foreground leading-snug flex items-center gap-1 min-w-0">
                  <span className="text-muted-foreground/50 shrink-0" aria-hidden="true">·</span>
                  {p.clientName && (
                    <>
                      <span className="text-muted-foreground shrink-0">{p.clientName}</span>
                      <span className="text-muted-foreground/40 shrink-0" aria-hidden="true">—</span>
                    </>
                  )}
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
              {atRiskProjects.length > MAX_ITEMS && (
                <li className="font-meta text-xs text-muted-foreground pl-3">
                  + {atRiskProjects.length - MAX_ITEMS} więcej
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Zadania na dziś */}
        {tasksDueToday.length > 0 && (
          <section className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2" aria-labelledby="section-today">
            <h3
              id="section-today"
              className="font-meta text-xs font-semibold text-status-at flex items-center gap-1.5"
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Zadania na dziś ({tasksDueToday.length})
            </h3>
            <ul className="flex flex-col gap-1.5" role="list">
              {tasksDueToday.slice(0, MAX_ITEMS).map((t, i) => (
                <li key={i} className="flex items-center gap-3 min-w-0">
                  <span className="font-heading text-sm text-foreground flex-1 truncate leading-snug">
                    {t.title}
                  </span>
                  <span className="font-meta text-xs text-muted-foreground shrink-0 hidden sm:block truncate max-w-[140px]">
                    {t.projectName}
                  </span>
                  {t.assigneeName && (
                    <span className="font-meta text-xs text-muted-foreground shrink-0 hidden md:block">
                      {t.assigneeName}
                    </span>
                  )}
                  <span className="font-meta text-xs font-semibold text-status-at shrink-0">
                    dziś
                  </span>
                </li>
              ))}
              {tasksDueToday.length > MAX_ITEMS && (
                <li className="font-meta text-xs text-muted-foreground">
                  + {tasksDueToday.length - MAX_ITEMS} więcej
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Zadania wkrótce */}
        {tasksDueSoon.length > 0 && (
          <section className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2" aria-labelledby="section-soon">
            <h3
              id="section-soon"
              className="font-meta text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Wkrótce ({tasksDueSoon.length})
            </h3>
            <ul className="flex flex-col gap-1.5" role="list">
              {tasksDueSoon.slice(0, MAX_ITEMS).map((t, i) => (
                <li key={i} className="flex items-center gap-3 min-w-0">
                  <span className="font-heading text-sm text-foreground flex-1 truncate leading-snug">
                    {t.title}
                  </span>
                  <span className="font-meta text-xs text-muted-foreground shrink-0 hidden sm:block truncate max-w-[140px]">
                    {t.projectName}
                  </span>
                  {t.assigneeName && (
                    <span className="font-meta text-xs text-muted-foreground shrink-0 hidden md:block">
                      {t.assigneeName}
                    </span>
                  )}
                  <span className="font-meta text-xs text-muted-foreground shrink-0">
                    {formatDate(t.dueDate)}
                  </span>
                </li>
              ))}
              {tasksDueSoon.length > MAX_ITEMS && (
                <li className="font-meta text-xs text-muted-foreground">
                  + {tasksDueSoon.length - MAX_ITEMS} więcej
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Wysokie burn rate */}
        {burnAlerts.length > 0 && (
          <section className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2" aria-labelledby="section-burn">
            <h3
              id="section-burn"
              className="font-meta text-xs font-semibold text-status-off flex items-center gap-1.5"
            >
              <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Wysokie burn rate ({burnAlerts.length})
            </h3>
            <ul className="flex flex-col gap-1" role="list">
              {burnAlerts.slice(0, MAX_ITEMS).map((p, i) => (
                <li key={i} className="font-meta text-sm text-foreground leading-snug flex items-center gap-2 min-w-0">
                  <span
                    className={p.burnRate >= 100 ? 'font-semibold text-status-off shrink-0' : 'font-semibold text-status-at shrink-0'}
                    aria-label={`${p.burnRate} procent`}
                  >
                    {p.burnRate}%
                  </span>
                  <span className="text-muted-foreground/40 shrink-0" aria-hidden="true">·</span>
                  {p.clientName && (
                    <>
                      <span className="text-muted-foreground shrink-0">{p.clientName}</span>
                      <span className="text-muted-foreground/40 shrink-0" aria-hidden="true">—</span>
                    </>
                  )}
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
              {burnAlerts.length > MAX_ITEMS && (
                <li className="font-meta text-xs text-muted-foreground pl-3">
                  + {burnAlerts.length - MAX_ITEMS} więcej
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
