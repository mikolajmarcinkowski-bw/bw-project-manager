import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Predykat R15 (D-056) — czy zadanie pasuje do wybranych typów projektu.
 *  Puste `appliesTo` = dotyczy wszystkich typów. Eksportowane dla client + server. */
export function taskMatchesTypes(appliesTo: string[], selectedTypes: string[]): boolean {
  if (appliesTo.length === 0) return true
  const sel = new Set(selectedTypes)
  return appliesTo.some((t) => sel.has(t))
}
