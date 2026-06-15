/**
 * build-selector.ts
 * Pure utility — no React, no side effects.
 * Computes a reasonably stable CSS selector for a given DOM element.
 */

/**
 * Returns the 1-based nth-of-type index among siblings sharing the same tag name.
 */
function nthOfType(el: Element): number {
  const tag = el.tagName;
  let n = 1;
  let prev = el.previousElementSibling;
  while (prev) {
    if (prev.tagName === tag) n++;
    prev = prev.previousElementSibling;
  }
  return n;
}

/**
 * Build a segment for a single element: tag:nth-of-type(n) plus optional data-* attribute.
 */
function buildSegment(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const nth = nthOfType(el);

  // Prefer a stable data-* attribute as additional qualifier
  const stableDataAttr = Array.from(el.attributes).find(
    (attr) => attr.name.startsWith('data-') && attr.value.length > 0 && attr.value.length < 40
  );

  if (stableDataAttr) {
    // Escape " i \ w wartości atrybutu (selektory atrybutowe w cudzysłowach).
    const val = stableDataAttr.value.replace(/(["\\])/g, '\\$1');
    return `${tag}[${stableDataAttr.name}="${val}"]:nth-of-type(${nth})`;
  }

  return `${tag}:nth-of-type(${nth})`;
}

/**
 * Builds an in-as-unique-as-possible CSS selector for the given element.
 *
 * Strategy:
 * 1. If element has an id → return `#id` immediately.
 * 2. Otherwise climb up to 5 levels composing `tag:nth-of-type(n)` segments.
 */
export function buildSelector(el: Element): string {
  // Fast path: element has its own id
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = el;
  let depth = 0;

  while (current && current.nodeType === Node.ELEMENT_NODE && depth < 5) {
    // Stop climbing at body/html
    const tag = current.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;

    // If any ancestor has an id, anchor there
    if (current.id && depth > 0) {
      segments.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    segments.unshift(buildSegment(current));
    current = current.parentElement;
    depth++;
  }

  // Fallback gdy kliknięto bezpośrednio body/html (brak segmentów).
  return segments.length > 0 ? segments.join(' > ') : 'body';
}

/**
 * Returns the lowercased tag name of an element.
 */
export function elementTag(el: Element): string {
  return el.tagName.toLowerCase();
}

/**
 * Returns the inner text of an element trimmed to 120 characters.
 */
export function elementText(el: Element): string {
  const raw = ('innerText' in el ? (el as HTMLElement).innerText : el.textContent) ?? '';
  return raw.trim().slice(0, 120);
}
