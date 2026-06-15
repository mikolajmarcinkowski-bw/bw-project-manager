'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type FeedbackCategory = Database['public']['Enums']['feedback_category']
type FeedbackPriority = Database['public']['Enums']['feedback_priority']

export interface SubmitFeedbackInput {
  page_path: string
  css_selector: string
  element_tag: string
  element_text: string
  comment: string
  category: FeedbackCategory
  priority: FeedbackPriority
  viewport_w: number
  viewport_h: number
  user_agent: string
  theme: string
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Nie jesteś zalogowany.' }
  }

  // Walidacja serwerowa (granica zaufania — nie ufamy typom compile-time z klienta).
  const CATEGORIES: FeedbackCategory[] = ['bug', 'visual', 'content', 'ux']
  const PRIORITIES: FeedbackPriority[] = ['low', 'medium', 'high']
  const comment = (input.comment ?? '').trim()
  if (comment.length < 1) return { error: 'Komentarz nie może być pusty.' }
  if (comment.length > 2000) return { error: 'Komentarz jest za długi (max 2000 znaków).' }
  if (!CATEGORIES.includes(input.category)) return { error: 'Nieprawidłowa kategoria.' }
  if (!PRIORITIES.includes(input.priority)) return { error: 'Nieprawidłowy priorytet.' }

  const cap = (v: string | null | undefined, n: number) =>
    (v ?? '').slice(0, n) || null

  const { error: insertError } = await supabase.from('ui_feedback').insert({
    author_id: user.id,
    page_path: cap(input.page_path, 512),
    css_selector: cap(input.css_selector, 1024),
    element_tag: cap(input.element_tag, 64),
    element_text: cap(input.element_text, 512),
    comment,
    category: input.category,
    priority: input.priority,
    viewport_w: Number.isFinite(input.viewport_w) ? input.viewport_w : null,
    viewport_h: Number.isFinite(input.viewport_h) ? input.viewport_h : null,
    user_agent: cap(input.user_agent, 512),
    theme: input.theme === 'dark' ? 'dark' : 'light',
  })

  if (insertError) {
    // Nie wyciekaj surowego błędu bazy do klienta — zaloguj po stronie serwera.
    console.error('[submitFeedback] insert failed:', insertError)
    return { error: 'Nie udało się zapisać zgłoszenia. Spróbuj ponownie.' }
  }

  return { ok: true }
}
