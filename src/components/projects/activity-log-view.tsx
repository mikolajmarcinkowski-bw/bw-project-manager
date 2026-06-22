import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  FileEdit,
  UserCheck,
  UserCog,
  Tag,
  CalendarDays,
  Hash,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityLogEntry } from '@/lib/data/projects'

// Status codes → Polish labels
const STATUS_PL: Record<string, string> = {
  todo: 'Zaplanowane',
  in_progress: 'W toku',
  done: 'Gotowe',
  for_quality: 'QA / Weryfikacja',
  na: 'N/D',
}

function translateStatus(raw: unknown): string {
  if (typeof raw === 'string' && raw in STATUS_PL) return STATUS_PL[raw]
  return typeof raw === 'string' ? raw : '—'
}

function humanizeAction(entry: ActivityLogEntry): {
  icon: LucideIcon
  label: string
  detail: string | null
} {
  switch (entry.action) {
    case 'update_task_status':
      return {
        icon: CheckCircle2,
        label: 'Zmieniono status zadania',
        detail: `${translateStatus(entry.before?.status)} → ${translateStatus(entry.after?.status)}`,
      }
    case 'update_task_assignee':
      return {
        icon: UserCheck,
        label: 'Przypisano konsultanta',
        detail: String(entry.after?.assignee_name ?? '—'),
      }
    case 'update_task_pm':
      return {
        icon: UserCog,
        label: 'Przypisano PM nadzorującego',
        detail: String(entry.after?.pm_assignee_id ?? '—'),
      }
    case 'update_task_est':
      return {
        icon: Hash,
        label: 'Zmieniono estymację',
        detail: `${entry.before?.est ?? '—'}h → ${entry.after?.est ?? '—'}h`,
      }
    case 'update_task_due_date':
      return {
        icon: CalendarDays,
        label: 'Zmieniono termin zadania',
        detail: String(entry.after?.due_date ?? '—'),
      }
    case 'update_task_warning_muted':
      return {
        icon: AlertTriangle,
        label: 'Wyciszono alert',
        detail: null,
      }
    case 'create_project':
      return {
        icon: FileEdit,
        label: 'Utworzono projekt',
        detail: null,
      }
    case 'update_project':
      return {
        icon: FileEdit,
        label: 'Zaktualizowano projekt',
        detail: null,
      }
    case 'change_user_role':
      return {
        icon: UserCog,
        label: 'Zmieniono rolę użytkownika',
        detail: null,
      }
    case 'activate_user':
      return {
        icon: UserCog,
        label: 'Aktywowano konto',
        detail: null,
      }
    case 'deactivate_user':
      return {
        icon: UserCog,
        label: 'Dezaktywowano konto',
        detail: null,
      }
    case 'set_project_pms':
      return {
        icon: UserCheck,
        label: 'Zaktualizowano PM-ów projektu',
        detail: null,
      }
    case 'bulk_hide_tasks':
      return {
        icon: Tag,
        label: 'Ukryto zadania N/D',
        detail: null,
      }
    default:
      return {
        icon: Clock,
        label: entry.action,
        detail: null,
      }
  }
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'przed chwilą'
  if (mins < 60) return `${mins} min. temu`
  if (hours < 24) return `${hours} godz. temu`
  if (days < 7) return `${days} dni temu`
  return new Date(isoString).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

interface ActivityLogViewProps {
  entries: ActivityLogEntry[]
}

export function ActivityLogView({ entries }: ActivityLogViewProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        <Clock className="h-10 w-10 text-muted-foreground/20" />
        <p className="font-meta text-sm text-muted-foreground">
          Brak zapisanych zmian dla tego projektu.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {entries.map((entry, index) => {
        const { icon: Icon, label, detail } = humanizeAction(entry)
        return (
          <div
            key={entry.id}
            className={cn(
              'flex items-start gap-3 px-1 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:duration-500',
              index !== entries.length - 1 && 'border-b border-border/50'
            )}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {/* Icon */}
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            {/* Content */}
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-heading text-sm font-medium text-foreground">{label}</span>
                <time className="font-meta text-[0.65rem] text-muted-foreground/60 shrink-0">
                  {relativeTime(entry.createdAt)}
                </time>
              </div>
              {entry.actorName && (
                <span className="font-meta text-xs text-muted-foreground">{entry.actorName}</span>
              )}
              {detail && (
                <span className="font-mono text-[0.65rem] text-muted-foreground/70 bg-muted/60 rounded px-1.5 py-0.5 w-fit mt-0.5">
                  {detail}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
