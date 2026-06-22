import { requireAdmin } from '@/lib/auth/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { ChevronLeft, FolderCog, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { TemplateStepEditor, TemplateTaskEditor, AddTaskButton } from '@/components/admin/template-editor'

export const metadata = { title: 'Szablony faz · BW Project Manager' }

export default async function AdminTemplatesPage() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [{ data: steps }, { data: tasks }] = await Promise.all([
    supabase
      .from('step_templates')
      .select('id, phase_number, phase_name, step_title, step_order, kind, owner_role, applies_to_types')
      .order('phase_number', { ascending: true })
      .order('step_order', { ascending: true }),
    supabase
      .from('step_task_templates')
      .select('id, step_template_id, task_order, task_title, kind, est, is_milestone, applies_to_types')
      .order('task_order', { ascending: true }),
  ])

  // Grupuj zadania wg step_template_id
  type TaskRow = NonNullable<typeof tasks>[number]
  const tasksByStep = new Map<string, TaskRow[]>()
  for (const task of tasks ?? []) {
    const arr = tasksByStep.get(task.step_template_id) ?? []
    arr.push(task)
    tasksByStep.set(task.step_template_id, arr)
  }

  // Grupuj klocki wg fazy
  type StepRow = NonNullable<typeof steps>[number]
  const phases = new Map<number, { phaseName: string; steps: StepRow[] }>()
  for (const step of steps ?? []) {
    if (!phases.has(step.phase_number)) {
      phases.set(step.phase_number, { phaseName: step.phase_name, steps: [] })
    }
    phases.get(step.phase_number)!.steps.push(step)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Nagłówek */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/admin"
            className="flex items-center gap-1 font-meta text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wróć do panelu admina"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Panel admina
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <FolderCog className="h-5 w-5 text-teal" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-foreground">Szablony faz i zadań</h1>
        </div>
        <p className="font-meta text-xs text-muted-foreground mt-0.5">
          Edytuj tytuły klocków i zadań. Zmiany dotyczą wyłącznie nowych projektów — istniejące projekty pozostają niezmienione.
        </p>
      </div>

      {/* Ostrzeżenie */}
      <div className="flex items-start gap-2.5 rounded-xl border border-status-at/30 bg-status-at/5 px-4 py-3">
        <AlertCircle className="h-4 w-4 text-status-at shrink-0 mt-0.5" aria-hidden="true" />
        <p className="font-meta text-xs text-status-at leading-relaxed">
          Zmiany w szablonach dotyczą <strong>nowych projektów</strong>. Zadania w istniejących projektach nie zostaną zmienione.
        </p>
      </div>

      {/* Fazy */}
      <div className="flex flex-col gap-4">
        {[...phases.entries()].map(([phaseNum, { phaseName, steps: phaseSteps }], idx) => (
          <div
            key={phaseNum}
            className="rounded-xl border border-border bg-card shadow-whisper overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Nagłówek fazy */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="font-mono text-[0.65rem] text-muted-foreground">F{phaseNum}</span>
              <span className="font-heading font-semibold text-sm text-foreground">{phaseName}</span>
            </div>

            {/* Klocki */}
            <div className="divide-y divide-border/60">
              {phaseSteps.map((step) => (
                <div key={step.id} className="px-4 py-3 flex flex-col gap-2">
                  <TemplateStepEditor
                    stepId={step.id}
                    currentTitle={step.step_title}
                    ownerRole={step.owner_role}
                  />
                  {/* Zadania klocka */}
                  {(tasksByStep.get(step.id) ?? []).map((task) => (
                    <div key={task.id} className="ml-4 flex items-center gap-2 py-1">
                      <TemplateTaskEditor
                        taskId={task.id}
                        currentTitle={task.task_title}
                        currentEst={task.est}
                        currentAppliesTo={task.applies_to_types ?? []}
                        isMilestone={task.is_milestone ?? false}
                      />
                    </div>
                  ))}
                  <AddTaskButton stepTemplateId={step.id} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {phases.size === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center flex flex-col items-center gap-3">
            <FolderCog className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
            <p className="font-meta text-sm font-medium text-muted-foreground">
              Brak szablonów faz w bazie danych.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
