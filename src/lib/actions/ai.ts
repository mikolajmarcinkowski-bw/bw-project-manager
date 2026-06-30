'use server'

import { requireUser } from '@/lib/auth/dal'
import { getDashboardBriefData, getClientsWithStats } from '@/lib/data/projects'

export interface AiPortfolioAlert {
  project: string
  issue: string
  action: string
}

export interface AiPortfolioAnalysis {
  summary: string
  alerts: AiPortfolioAlert[]
  priorities: string[]
}

// D-R2 — AI Dashboard Analysis (Wariant A: on-demand)
// Wyjątek od R11: jedyne miejsce gdzie OpenAI API żyje w kodzie aplikacji (D-016 approved 2026-06-30)
// Dane wysyłane do OpenAI: nazwy klientów, nazwy projektów, metryki (burn%, liczby) — dane biznesowe BW,
// nie dane osobowe osób fizycznych. Akceptowane w ramach D-016. OPENAI_API_KEY = server-side only.
export async function analyzePortfolio(): Promise<
  { ok: true; data: AiPortfolioAnalysis } | { error: string }
> {
  await requireUser()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { error: 'Analiza AI niedostępna — brak konfiguracji klucza API.' }
  }

  // Pobierz dane portfela
  const [briefData, clients] = await Promise.all([
    getDashboardBriefData(),
    getClientsWithStats(),
  ])

  const totalActive = clients.reduce((sum, c) => sum + c.activeCount, 0)

  // Zbuduj prompt z danych portfela (bez PII)
  const contextLines: string[] = [
    `Portfel: ${totalActive} aktywnych projektów HubSpot CRM / integracyjnych.`,
  ]

  if (briefData.atRiskProjects.length > 0) {
    contextLines.push(`Zagrożone projekty (zadania po terminie):`)
    for (const p of briefData.atRiskProjects.slice(0, 5)) {
      contextLines.push(`  - ${p.name} (klient: ${p.clientName})`)
    }
  } else {
    contextLines.push(`Zagrożone projekty: brak.`)
  }

  if (briefData.burnAlerts.length > 0) {
    contextLines.push(`Alerty burn rate (≥80% budżetu):`)
    for (const b of briefData.burnAlerts.slice(0, 5)) {
      contextLines.push(`  - ${b.name}: ${b.burnRate}% burn (klient: ${b.clientName})`)
    }
  } else {
    contextLines.push(`Burn rate: brak alertów.`)
  }

  contextLines.push(
    `Zadania na dziś: ${briefData.tasksDueToday.length}`,
    `Zadania wkrótce (1-2 dni): ${briefData.tasksDueSoon.length}`,
  )

  const userPrompt = contextLines.join('\n')

  const systemPrompt = `Jesteś asystentem Project Managera w firmie wdrożeniowej HubSpot.
Analizujesz portfel projektów i dajesz konkretne, zwięzłe rekomendacje po polsku.
Odpowiedz wyłącznie poprawnym JSON w formacie:
{
  "summary": "Krótkie podsumowanie kondycji portfela (1-2 zdania, konkretne)",
  "alerts": [{"project": "nazwa", "issue": "problem", "action": "co zrobić"}],
  "priorities": ["priorytet 1", "priorytet 2", "priorytet 3"]
}
Maksymalnie 3 alerty i 3 priorytety. Alerty tylko dla realnych problemów. Jeśli portfel jest OK — powiedz to.`

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    })
  } catch {
    return { error: 'Nie udało się połączyć z usługą AI. Sprawdź połączenie.' }
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error('[analyzePortfolio] OpenAI error:', res.status, errBody.slice(0, 200))
    return { error: `Błąd usługi AI (${res.status}). Spróbuj ponownie za chwilę.` }
  }

  let parsed: { choices?: { message?: { content?: string } }[] }
  try {
    parsed = await res.json()
  } catch {
    return { error: 'Nieprawidłowa odpowiedź z usługi AI.' }
  }

  const content = parsed?.choices?.[0]?.message?.content ?? ''
  let analysis: AiPortfolioAnalysis
  try {
    analysis = JSON.parse(content)
    if (!analysis.summary || !Array.isArray(analysis.alerts) || !Array.isArray(analysis.priorities)) {
      throw new Error('missing fields')
    }
  } catch {
    console.error('[analyzePortfolio] JSON parse failed, raw:', content.slice(0, 300))
    return { error: 'Analiza zwróciła nieoczekiwany format. Spróbuj ponownie.' }
  }

  return { ok: true, data: analysis }
}
