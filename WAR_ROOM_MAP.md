# WAR_ROOM_MAP — Mapa dokumentacji projektu

> Pełna mapa folderu BW-ProjectManager z opisem każdego pliku.
> Służy AI do orientacji "gdzie jest co" bez przeszukiwania struktury.
>
> WAR_ROOM = /Users/mikolajmarcinkowski/Library/CloudStorage/OneDrive-RevPointsp.o.o/Dokumenty/BW-ProjectManager/

---

## Pliki sterujące (root)

| Plik | Opis | Priorytet |
|------|------|-----------|
| `STATUS.md` | **Zawsze-aktualny snapshot** — gdzie jest projekt, co w toku, następny krok, blokery | 🔴 Czytaj na start |
| `log.md` | Append-only kronika sesji — historia wszystkich decyzji i prac | 🟡 Historia |
| `CLAUDE.md` | Instrukcje dla AI w war-roomie (nie mylić z build CLAUDE.md) | 🟡 Kontekst |
| `index.md` | Katalog wszystkich stron wiki z opisami | 🟡 Nawigacja |
| `DESIGN.md` | Design system businessweb.pl wyekstrahowany ze strony — 11 sekcji | 🟢 Design ref |
| `PRODUCT.md` | Kontekst produktu dla skilla impeccable (register: product) | 🟢 Design ref |

---

## product-specs/2026-06-03-bw-project-manager/ — ARTEFAKTY BUDOWY

| Plik | Opis | Priorytet |
|------|------|-----------|
| **`04-spec.md`** | **GŁÓWNY PRD** — 27 user stories GIVEN/WHEN/THEN, 3 flows, reguły R1–R15, model danych, dowody źródłowe. Jedyne źródło prawdy. | 🔴 KRYTYCZNY |
| **`03-design-source.md`** | **Design system BW** — tokeny kolorów (jasny+ciemny), fonty Montserrat/Lexend/SpaceGrotesk, komponenty, layout | 🔴 KRYTYCZNY |
| `07-initial-prompt.md` | Prompt operacyjny do Claude Code — plan 5-fazowy z delegacją subagentów | 🔴 START BUDOWY |
| `05-mvp-decision.html` | Decyzje MoSCoW — standalone z pełnymi user stories + GIVEN/WHEN/THEN per feature | 🟡 Walidacja |
| `06-wireframes.html` | 13 ekranów Hi-Fi + adnotacje UX (Co tu jest / Interakcje / Reguły) | 🟡 Wizualizacja |
| `05-mvp-decision-review.html` | Wersja do recenzji przez Olę/Dominikę (pinezki inspekcji) | 🟢 Review |
| `06-wireframes-review.html` | Wersja do recenzji przez Olę/Dominikę (pinezki inspekcji) | 🟢 Review |
| `README.md` | Indeks paczki buildowej, instrukcja startu | 🟢 Orientacja |
| `02-brief.md` | Brief produktu — problem, persona (Ola+Dominika), propozycja wartości, success criteria | 🟢 Kontekst |
| `03-design.md` | Design direction w prozie (wejście do 07-initial-prompt) | 🟢 Kontekst |
| `01-pomysl.md` | Surowy brain dump Mikołaja | 🟢 Historia |
| `_STATUS.md` | Stan kroków 1–7 skilla /od-pomyslu-do-promptu | 🟢 Historia |

---

## wiki/technical/ — SPECYFIKACJA TECHNICZNA

| Plik | Opis | Priorytet |
|------|------|-----------|
| **`decisions.md`** | Log decyzji D-001…D-051 — każda decyzja architektoniczna z uzasadnieniem | 🔴 KRYTYCZNY |
| **`data-model.md`** | Schemat bazy danych — wszystkie encje, relacje, pola, RLS visibility | 🔴 KRYTYCZNY |
| **`mcp-tools.md`** | Lista operacji MCP (18 READ + 22 WRITE) — parametry, opisy, auth | 🔴 KRYTYCZNY |
| `stack.md` | Stack technologiczny + diagram architektury UI vs Cowork+MCP | 🟡 Architektura |

---

## wiki/product/ — SPECYFIKACJA PRODUKTOWA

| Plik | Opis | Priorytet |
|------|------|-----------|
| `product-backlog.md` | Product backlog (Ola = PO) — epiki, priorytety, wersjonowanie | 🟡 Produkt |
| `mvp-scope.md` | Zakres MVP — co w/out of scope, filozofia Good Enough | 🟡 Zakres |
| `brief.md` | Kompletny brief (nazwa, problem, persona, wartość, MVP, success criteria) | 🟡 Kontekst |
| `users.md` | Profile użytkowników — Ola, Dominika, ich potrzeby i bolączki | 🟡 Kontekst |
| `documents-catalog.md` | Katalog 12 dokumentów projektowych BW z analizą pól i implikacjami DB | 🟡 Dokumenty |
| `overview.md` | Cel, problem, kontekst biznesowy | 🟢 Tło |
| `questions-for-delivery.md` | Pytania na spotkanie + odpowiedzi po spotkaniu 03.06 | 🟢 Historia |

---

## wiki/process/ — MATRYCA PROCESU

| Plik | Opis | Priorytet |
|------|------|-----------|
| **`bw-process-matrix.md`** | Matryca 6 faz BW — fazy, kroki, role, Stage Gates. **Seed szablonów klocków w DB.** | 🔴 KRYTYCZNY dla seed |

---

## raw/ — ŹRÓDŁA ORYGINALNE (nie edytować)

| Plik/katalog | Opis |
|--------------|------|
| `-Delivery-automat-3de60432-83af.md` | **Transkrypcja spotkania 03.06** (Mikołaj+Ola+Dominika) — NAJBARDZIEJ AKTUALNE źródło wymagań |
| `Ola-Miko-aj-delivery-8e4ff053-ae0d.md` | Transkrypcja spotkania z Olą 18.05 |
| `Koncepcja-delivery-app-konsultacja-b1451eed-245a.md` | Transkrypcja konsultacji z Dominiką 27.05 |
| `brain-dump_mikolaj_2026-06-03.md` | Ustrukturyzowany brain dump Mikołaja |
| `BW_Proces_Zarzadzania_Projektem.html` | Oryginalna wizualizacja matrycy procesu BW |
| `Delivery_App_User_Flow (1).html` | Koncept UI Oli+Dominiki (tylko kształt, nie design — D-030) |
| `00_harmonogram.html` | **Harmonogram 9-fazowy** (FAZA 0–8 + Sprint 2, MS0–MS7, kind, typy) — seed struktury Gantta |
| `01_governance_template.html` | Template governance + spotkania |
| `02_raci_template.html` | Macierz RACI (8 ról: SP/PM/ARCH/SPEC/BPO/IT/USR/QA) |
| `03_raid_log_template.html` | Template RAID Log (P×W, RAG) |
| `03_raid_log_przykład.html` | Przykład RAID Log |
| `04_budget_tracker_template.html` | Template Budget Tracker (stawki K/W/D) |
| `04_budget_tracker_przykład.html` | Przykład Budget Tracker |
| `05_kpi_tracker.html` | KPI Tracker + milestony |
| `06_escalation_przykład.html` | Ścieżki eskalacji |
| `07_stakeholder_map.html` | Mapa interesariuszy (Power/Interest) |
| `08_pytania_watpliwosci.html` | Rejestr pytań i wątpliwości (RAG) |
| `09_change_request.html` | Change Request workflow |

---

## skills/ — Skille skilla `/od-pomyslu-do-promptu`

| Ścieżka | Opis |
|---------|------|
| `skills/od-pomyslu-do-promptu-SDD/od-pomyslu-do-promptu/SKILL.md` | Główny plik skilla (7 kroków) |
| `skills/od-pomyslu-do-promptu-SDD/.../references/` | Referencje: persona konsultanta, Moscow, design.md, replit blueprint |
| `skills/od-pomyslu-do-promptu-SDD/.../templates/` | Szablony HTML: brief, spec, mvp, wireframes, user-journeys |

**Globalne skille AI** (nie w war-roomie):
- `~/.claude/skills/impeccable/` — skill designu frontendowego (ZAWSZE używaj dla UI)
- `~/.claude/agents/` — 35 subagentów VoltAgent

---

## Kluczowe decyzje (D-001…D-051) — skrót

Pełny log w `wiki/technical/decisions.md`. Najważniejsze:

| ID | Decyzja |
|----|---------|
| D-016 | UI = podgląd/monitoring; MCP = tworzenie/setup; zero AI w Next.js |
| D-032 | Tworzenie projektu = Claude + skill + edycyjny serwer MCP (główna ścieżka) |
| D-033 | Aplikacja TYLKO wewnętrzna — brak logowania klienta/specjalisty |
| D-036 | Gantt = centralny widok projektu |
| D-037 | Realizacja ∥ Kontrola równolegle (nie sekwencja) |
| D-039 | Diamenciki = decyzje warunkowe, NIE milestony |
| D-043 | Aplikacja świadoma realnego kalendarza (dni robocze, święta) |
| D-044 | Archiwizacja = „detonator" z ponownym logowaniem |
| D-048 | Ola = Product Owner; prowadzimy product-backlog.md |
| D-051 | Zadania ukrywane (nie wyszarzone); 5 typów CRM/SPO/INT/MKT/ERP; 9-fazowy seed; P11/P12/P14 → P0 |
