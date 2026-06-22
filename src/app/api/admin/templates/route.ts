import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/dal'

export async function GET(request: NextRequest) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: steps, error: stepsErr } = await supabase
    .from('step_templates')
    .select('id, phase_number, phase_name, step_title, step_order, kind, owner_role, is_recurring, is_parallel, is_decision, applies_to_types')
    .order('phase_number', { ascending: true })
    .order('step_order', { ascending: true })

  const { data: tasks, error: tasksErr } = await supabase
    .from('step_task_templates')
    .select('id, step_template_id, task_order, task_title, kind, est, is_milestone, applies_to_types')
    .order('task_order', { ascending: true })

  if (stepsErr || tasksErr) {
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: { steps: steps ?? [], tasks: tasks ?? [] } })
}
