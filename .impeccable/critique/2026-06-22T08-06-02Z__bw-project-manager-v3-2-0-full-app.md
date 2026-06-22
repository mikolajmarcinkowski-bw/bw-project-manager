---
target: BW Project Manager v3.2.0 — full app
total_score: 32
p0_count: 0
p1_count: 2
timestamp: 2026-06-22T08-06-02Z
slug: bw-project-manager-v3-2-0-full-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Progress bar, "TU JESTEŚ" pill, RAG chipsy — zawsze wiadomo co się dzieje |
| 2 | Match System / Real World | 4 | Pełny polski, teczki/zagrożone/burn — terminologia delivery bez żargonu technicznego |
| 3 | User Control and Freedom | 3 | Kolumny rozwijalne, dialogi na destrukcyjne akcje. Brak undo dla statusów zadań |
| 4 | Consistency and Standards | 3 | Pill-chipsy i spacing OK. Niespójna siła sygnału "aktywna faza" między phase-strip (border-2+ring) a parallel-view (border-teal/40 opacity — 4× słabszy) |
| 5 | Error Prevention | 3 | Dialogi potwierdzające (archive/dezaktywacja). Brak copy "nieodwracalne" przy destruktywnych akcjach |
| 6 | Recognition Rather Than Recall | 4 | Ikony + tekst, kolory RAG kodują statusy, activity-log tłumaczy akcje automatycznie |
| 7 | Flexibility and Efficiency | 3 | Briefing skraca do 5 itemów + link. Brak filtrowania portfela 30 projektów po fazie/typie |
| 8 | Aesthetic and Minimalist Design | 2 | DUPLIKATsygnałów: PortfolioStrip + briefing chipsy powtarzają "zagrożone" i "dziś" jeden pod drugim. Side-stripe KpiCard (border-l-4) łamie brand |
| 9 | Error Recovery | 3 | Komunikaty błędów z role="alert". Brak guidance "co zrobić" po błędzie |
| 10 | Help and Documentation | 3 | Tooltips istnieją. "Burn rate" bez wyjaśnienia; ASCII "sie" zamiast "się" w phase-strip |
| **Total** | | **32/40** | **Good — above average, specific premium gaps** |

## Anti-Patterns Verdict

**LLM assessment:** Aplikacja NIE wygląda AI-generated. Brak hero sections, gradient-text, glassmorphism, SaaS-cream. System tokenów kolorystycznych spójny, pill-button language konsekwentny, shadow-whisper system elegancki. Dwie konkretne odchyłki od design system: side-stripe borders (dryf) i duplikat statystyk na dashboardzie.

**Deterministic scan (2 findings UI, 2 email-only):**
- `budget-view.tsx:817` — `border-l-4` na KpiCard (side-tab, ❌ zakazany)
- `cr-view.tsx:393` — `border-l-4` na info-boxie (side-tab, ❌ zakazany)
- `api/cron/daily-brief/route.ts:80,96` — w HTML emailu (false positive — nie UI)

Detektor i LLM review zgodne: 2 prawdziwe side-stripe UI, 2 fałszywe alarmy w emailu.

## Overall Impression

Solidny PM-tool z jasną tożsamością wizualną. Największa szansa: zduplikowane statystyki na dashboardzie aktywnie hamują Olę każdego ranka. Drugie miejsce: side-stripe borders sygnalizują dryf od dyscypliny brandu — jeśli nie naprawione, będą się mnożyć.

## What's Working

1. **"Wszystko pod kontrolą" state** — gdy brak alertów, zielony komunikat z CheckCircle2 buduje zaufanie. Emotionally correct peak-end.
2. **Briefing chipsy RAG** — Zagrożone/Dziś/Wkrótce/Burn w jednym rzędzie: jeden rzut oka = pełny status poranny. Właściwa abstrakcja dla Head of Delivery.
3. **"TU JESTEŚ" pill na phase-strip** — absolutnie pozycjonowany, teal/amber kodowany, aria-label pełny. Wierne makiecie i dostępne.

## Priority Issues

**[P1] Zduplikowane statystyki na dashboardzie**
DashboardPortfolioStrip i DashboardBriefing chipsy pokazują "Zagrożone" i "Zadania dziś" dwa razy, jeden pod drugim. Ola skanuje rano — podwójny sygnał wymaga weryfikacji "czy to to samo?". Łamie minimalizm (Nielsen #8) i cognitive load. Fix: strip zachowuje tylko metryk portfela (Aktywne, Łącznie projektów), briefing ma wyłączność na alerty.
Suggested command: /impeccable distill

**[P2] Side-stripe borders w KpiCard i CR info-box**
budget-view.tsx:817 i cr-view.tsx:393 używają border-l-4 — dwa zakazane wzorce (DESIGN.md). KpiCard ma jednocześnie 4 identyczne kafelki w rzędzie (drugi zakaz). Fix KpiCard: usuń border-l-4, przenieś akcent na wartość (text-status-off/text-teal). Fix CR info-box: zamień na bg-teal/5 border border-teal/20 rounded-lg.
Suggested command: /impeccable polish

**[P2] Niespójna siła sygnału aktywnej fazy**
phase-strip.tsx używa border-2 border-teal ring-2 ring-teal/25 (spec-compliant). parallel-view.tsx używa border-teal/40 shadow-whisper (4× słabszy). W widoku z 3 aktywnymi fazami aktywna kolumna ginie. Fix: parallel-view → border-2 border-teal ring-1 ring-teal/20.
Suggested command: /impeccable polish

**[P3] Brak animacji na expand/collapse**
ParallelView task rows, ActivityLog entries, DashboardBriefing sekcje — wszystko pojawia się abruptowo (pop-in). ClientCard ma wzorcowy stagger 40ms. Brak motion-safe:animate-in na tych komponentach.
Suggested command: /impeccable animate

**[P3] "Burn rate" bez wyjaśnienia + ASCII "sie"**
Chipy "burn" w briefingu nie mają tooltipa — nowy PM nie wie czy to dobry czy zły sygnał. phase-strip:115 ma "pojawia sie" zamiast "pojawia się". Fix: title="Stopień wykorzystania budżetu — powyżej 100% = przekroczenie" + poprawka ASCII.
Suggested command: /impeccable clarify

## Persona Red Flags

**Ola (Head of Delivery, Power User, skanuje co rano):**
- Dashboard: dwie kolumny liczb "zagrożone" zmuszają do porównania — strata 2-3 sekund każdego ranka
- Brak filtra portfela po PM/fazie/typie — przy 30 projektach musi scrollować
- "Burn rate" bez wyjaśnienia — musi pamiętać co oznacza

**Dominika (PM, używa projektu głębiej):**
- KpiCard border-l-4 konkuruje z systemem RAG — musi się uczyć dwóch kodów kolorystycznych
- Aktywna faza w parallel-view słabo wyróżniona przy 3 aktywnych fazach
- expand/collapse zadań bez animacji — dezorientuje (czy kliknęło czy nie?)

## Minor Observations

- phase-strip.tsx:115: "pojawia sie" → "pojawia się"
- Halo blur-xl w empty-state dashboardu (bg-teal/8 blur-xl) — granicznie, defensywne. Jeśli zdecydowanie nie chcemy ambient glow: usuń.
- Tooltips na kolumnach tabeli admin/team mają title= — dobre, ale title jest deprecated na mobile. Rozważyć popovers w przyszłości.
- ActivityLog: humanizeAction default case zwraca raw snake_case — przy nowej akcji user widzi "update_task_pm" zamiast polskiego opisu.

## Questions to Consider

- "Czy PortfolioStrip spełnia swoją rolę, skoro briefing już ma te dane — może strip powinien pokazywać wyłącznie portfelowe metyki, nie alerty?"
- "Co by się stało gdyby expand/collapse w ParallelView miał 150ms slide-down zamiast pop-in — czy PM przestałby się zastanawiać czy kliknął?"
- "Czy 'burn rate' to termin, który Ola i Dominika rozumieją bez wyjaśnienia, czy warto go zastąpić 'Wykorzystanie budżetu'?"
