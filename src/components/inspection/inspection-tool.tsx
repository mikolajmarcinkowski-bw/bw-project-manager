'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Crosshair, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildSelector, elementTag, elementText } from './build-selector'
import { submitFeedback } from '@/lib/actions/feedback'
import type { Database } from '@/types/supabase'

type FeedbackCategory = Database['public']['Enums']['feedback_category']
type FeedbackPriority = Database['public']['Enums']['feedback_priority']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode =
  | { type: 'idle' }
  | { type: 'armed' }
  | {
      type: 'form'
      target: Element
      selector: string
      tag: string
      text: string
      clickX: number
      clickY: number
    }

interface InspectionToolProps {
  isTester: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Błąd' },
  { value: 'visual', label: 'Wygląd' },
  { value: 'content', label: 'Treść' },
  { value: 'ux', label: 'UX' },
]

const PRIORITIES: { value: FeedbackPriority; label: string }[] = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
]

// ---------------------------------------------------------------------------
// Highlight helper
// ---------------------------------------------------------------------------

let highlightBox: HTMLDivElement | null = null

function attachHighlight(el: Element): void {
  removeHighlight()
  const rect = el.getBoundingClientRect()
  const box = document.createElement('div')
  box.id = '__bw_inspect_highlight__'
  Object.assign(box.style, {
    position: 'fixed',
    top: `${rect.top - 2}px`,
    left: `${rect.left - 2}px`,
    width: `${rect.width + 4}px`,
    height: `${rect.height + 4}px`,
    outline: '2px solid var(--teal, #28B39B)',
    outlineOffset: '2px',
    borderRadius: '3px',
    pointerEvents: 'none',
    zIndex: '2147483645',
    background: 'oklch(0.6902 0.1186 177.74 / 0.06)',
    transition: 'all 0.1s ease',
  })
  document.body.appendChild(box)
  highlightBox = box
}

function removeHighlight(): void {
  if (highlightBox) {
    highlightBox.remove()
    highlightBox = null
  }
  const stale = document.getElementById('__bw_inspect_highlight__')
  if (stale) stale.remove()
}

// ---------------------------------------------------------------------------
// Panel position — keep it near the click but inside viewport
// ---------------------------------------------------------------------------

const PANEL_W = 320
const PANEL_H = 380
const MARGIN = 16

function calcPanelPos(
  clickX: number,
  clickY: number
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = clickX + 16
  let top = clickY - 40

  if (left + PANEL_W + MARGIN > vw) left = clickX - PANEL_W - 16
  if (left < MARGIN) left = MARGIN
  if (top + PANEL_H + MARGIN > vh) top = vh - PANEL_H - MARGIN
  if (top < MARGIN) top = MARGIN

  return { top, left }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InspectionTool({ isTester }: InspectionToolProps) {
  const { resolvedTheme } = useTheme()

  const [mode, setMode] = useState<Mode>({ type: 'idle' })
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [priority, setPriority] = useState<FeedbackPriority>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ------------------------------------------------------------------
  // Capture-phase listener — active only while mode === 'armed'
  // ------------------------------------------------------------------
  const handleCaptureClick = useCallback(
    (e: MouseEvent) => {
      // Ignore clicks inside our own overlay
      if (
        containerRef.current &&
        containerRef.current.contains(e.target as Node)
      ) {
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const target = e.target as Element
      const selector = buildSelector(target)
      const tag = elementTag(target)
      const text = elementText(target)

      attachHighlight(target)

      setMode({
        type: 'form',
        target,
        selector,
        tag,
        text,
        clickX: e.clientX,
        clickY: e.clientY,
      })
    },
    []
  )

  useEffect(() => {
    if (mode.type === 'armed') {
      document.addEventListener('click', handleCaptureClick, { capture: true })
      document.body.style.cursor = 'crosshair'
    } else {
      document.removeEventListener('click', handleCaptureClick, { capture: true })
      document.body.style.cursor = ''
    }

    return () => {
      document.removeEventListener('click', handleCaptureClick, { capture: true })
      document.body.style.cursor = ''
    }
  }, [mode.type, handleCaptureClick])

  // Cleanup highlight when leaving form mode
  useEffect(() => {
    if (mode.type !== 'form') {
      removeHighlight()
    }
  }, [mode.type])

  // Escape wychodzi z trybu inspekcji (armed lub form)
  useEffect(() => {
    if (mode.type === 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMode({ type: 'idle' })
      setComment('')
      setCategory('bug')
      setPriority('medium')
      removeHighlight()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode.type])

  // Auto-focus pola komentarza po otwarciu panelu
  useEffect(() => {
    if (mode.type === 'form') textareaRef.current?.focus()
  }, [mode.type])

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function toggleArmed() {
    setMode((prev) =>
      prev.type === 'idle' ? { type: 'armed' } : { type: 'idle' }
    )
    resetForm()
  }

  function cancel() {
    setMode({ type: 'idle' })
    resetForm()
    removeHighlight()
  }

  function resetForm() {
    setComment('')
    setCategory('bug')
    setPriority('medium')
  }

  async function handleSubmit() {
    if (mode.type !== 'form') return
    if (!comment.trim()) return

    setSubmitting(true)
    setToast(null)

    const result = await submitFeedback({
      page_path: window.location.pathname,
      css_selector: mode.selector,
      element_tag: mode.tag,
      element_text: mode.text,
      comment: comment.trim(),
      category,
      priority,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      user_agent: navigator.userAgent,
      theme: resolvedTheme ?? 'light',
    })

    setSubmitting(false)

    if ('ok' in result) {
      setToast({ msg: 'Zapisano! Dzięki za feedback.', ok: true })
      setTimeout(() => {
        setToast(null)
        cancel()
      }, 1800)
    } else {
      setToast({ msg: `Błąd: ${result.error}`, ok: false })
    }
  }

  // ------------------------------------------------------------------
  // Render guard
  // ------------------------------------------------------------------

  if (!isTester) return null

  const isActive = mode.type !== 'idle'
  const panelPos =
    mode.type === 'form'
      ? calcPanelPos(mode.clickX, mode.clickY)
      : { top: 0, left: 0 }

  // ------------------------------------------------------------------
  // JSX
  // ------------------------------------------------------------------

  return (
    <div ref={containerRef}>
      {/* Floating toggle pill */}
      <div
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2147483646 }}
      >
        <button
          onClick={toggleArmed}
          aria-pressed={isActive}
          aria-label={isActive ? 'Wyłącz tryb inspekcji' : 'Włącz tryb inspekcji'}
          title={isActive ? 'Wyłącz tryb inspekcji' : 'Włącz tryb inspekcji'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '9999px',
            border: isActive
              ? '1.5px solid var(--teal, #28B39B)'
              : '1.5px solid var(--border, #D1D5DB)',
            background: isActive
              ? 'oklch(0.6902 0.1186 177.74 / 0.12)'
              : 'var(--card, #F3F4F6)',
            color: isActive
              ? 'var(--teal, #28B39B)'
              : 'var(--muted-foreground, #6B7280)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
        >
          <Crosshair size={14} strokeWidth={2} />
          {isActive && mode.type === 'armed' ? 'Kliknij element' : isActive ? 'Inspekcja wł.' : 'Inspekcja'}
        </button>
      </div>

      {/* Feedback form panel — appears near clicked element */}
      {mode.type === 'form' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nowy komentarz do inspekcji"
          style={{
            position: 'fixed',
            top: panelPos.top,
            left: panelPos.left,
            width: `${PANEL_W}px`,
            zIndex: 2147483647,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              Nowy komentarz
            </span>
            <button
              onClick={cancel}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '4px',
              }}
              aria-label="Anuluj"
              title="Anuluj"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Element context */}
          <div
            style={{
              background: 'var(--muted)',
              borderRadius: '6px',
              padding: '6px 8px',
              fontSize: '0.7rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
              wordBreak: 'break-all',
            }}
          >
            <span style={{ opacity: 0.7 }}>{mode.tag}</span>
            {mode.text && (
              <>
                {' '}
                <span style={{ opacity: 0.55 }}>
                  &ldquo;{mode.text.slice(0, 50)}{mode.text.length > 50 ? '...' : ''}&rdquo;
                </span>
              </>
            )}
          </div>

          {/* Comment textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              htmlFor="bw-inspect-comment"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              Co jest nie tak? <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <textarea
              id="bw-inspect-comment"
              ref={textareaRef}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--teal, #28B39B)'
                e.currentTarget.style.boxShadow = '0 0 0 2px oklch(0.6902 0.1186 177.74 / 0.25)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              placeholder="Opisz problem…"
              style={{
                width: '100%',
                resize: 'vertical',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--input)',
                color: 'var(--foreground)',
                fontSize: '0.8125rem',
                padding: '7px 9px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category + Priority row */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="bw-inspect-category"
                style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}
              >
                Kategoria
              </label>
              <select
                id="bw-inspect-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                style={{
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input)',
                  color: 'var(--foreground)',
                  fontSize: '0.8125rem',
                  padding: '5px 7px',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  outline: 'none',
                  width: '100%',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label
                htmlFor="bw-inspect-priority"
                style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}
              >
                Priorytet
              </label>
              <select
                id="bw-inspect-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                style={{
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--input)',
                  color: 'var(--foreground)',
                  fontSize: '0.8125rem',
                  padding: '5px 7px',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  outline: 'none',
                  width: '100%',
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div
              style={{
                borderRadius: '6px',
                padding: '7px 10px',
                fontSize: '0.75rem',
                fontWeight: 500,
                background: toast.ok
                  ? 'oklch(0.6902 0.1186 177.74 / 0.12)'
                  : 'oklch(0.6234 0.1877 24.72 / 0.12)',
                color: toast.ok ? 'var(--teal)' : 'var(--destructive)',
                border: `1px solid ${toast.ok ? 'var(--teal)' : 'var(--destructive)'}`,
              }}
            >
              {toast.msg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={cancel}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--muted-foreground)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              Anuluj
            </button>
            <Button
              onClick={handleSubmit}
              disabled={!comment.trim() || submitting}
            >
              {submitting ? 'Wysyłanie...' : 'Wyślij'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
