# CHANGELOG — Historia wersji

> Aktualizuj po każdym deployu lub ukończonej fazie.

---

## [1.3.0] — 2026-06-18 — 🚀 PRODUKCJA: MCP kompletny (41/46) + auth consolidation + skill przebudowany

> Status: **ZMERGOWANE → produkcja** (`main`, `651fdaf`). Sesja 16 (wieczór).

### Naprawiono — MCP Server
- **Auth consolidation**: 20 routów zastąpiło inline `verifyToken` importem `verifyMcpToken` z `src/lib/mcp/auth.ts` — jedna zmiana logiki auth = zmiana w 1 miejscu
- **Formaty odpowiedzi**: `create_project` teraz zwraca `{ ok: true, data: { project_id, project_url } }` jak wszystkie inne tools
- **Error shapes**: 5 routów (create_project, bulk_hide_tasks, update_task_status, update_task, set_task_owner) ujednolicone do `{ ok: false, error }`
- **`update_milestone`**: obsługuje pole `name`, `.maybeSingle()` zamiast `.single()` (brak 500 przy UPDATE)
- **`setup_project_full`**: przyjmuje `name` w milestoneach — koniec z „MS0 MS1 MS2"
- **`add_budget_line`**: walidacja że `task_id` należy do projektu
- **`set_project_pms`**: zapisuje do `activity_log`

### Dodano — nowe MCP tools (41/46 spec)
- `create_client` — tworzy klienta w BW PM (sprawdza duplikaty, `already_existed` flag)
- `get_project_steps` — fazy projektu z opcjonalnym filtrem po fazie
- `get_daily_brief` — zaległe + zbliżające się zadania ze wszystkich aktywnych projektów

### Przebudowano — Skill `/bw-project-manager`
- Prowadzi PM-a krok po kroku (nie mechanicznie)
- Pyta o konkretne nazwy milestoneów (nie „MS0 MS1"), budżet, team
- Standardowe wzorcowe nazwy MS0–MS7 wbudowane w prompt
- RACI jako osobna sesja z wyjaśnieniem

### Naprawiono — Layout
- Sidebar `h-screen sticky top-0` — stały pasek, scroll tylko w prawej części

### MCP tools: **41/46** (89% specyfikacji)

---

## [1.2.0] — 2026-06-18 — 🚀 PRODUKCJA: Premium end-to-end — synergies, health metrics, MCP Faza 2

> Status: **ZMERGOWANE → produkcja** (`main`, `ff5f9c1`). Sesja 16 (popołudnie).
> Pełna synergia dokumentów, health metrics, MCP Faza 2 (38 tools), fix layoutu.

### Dodano — Synergies (przepływy między dokumentami)
- **RAID → CR**: przycisk `↑ CR` przy ryzyku (open/monitor) → pre-wypełniony formularz CR z opisem ryzyka, poziomem wpływu z RAG, powiązanie `risk_id`
- **Diamencik CR-type → CR form**: po zatwierdzeniu decyzji `change_request/yes` pojawia się link „Otwórz formularz Change Request"
- **Budget → Gantt tasks**: task picker w formularzu budżetowym — wybór zadania auto-wypełnia opis i godziny

### Dodano — Health metrics w nagłówku projektu
- Mini-badges w headerze: `▲ NR` (ryzyka R), `CR: N` (oczekujące), `Burn: N%` (>75%)
- Kolory wg kanonu RAG: czerwony >90% burn, amber >75%, ukryte gdy 0/null
- `getProjectHealthMetrics()` — 3 równoległe SELECT (risks, change_requests, budget_lines)

### Dodano — MCP Faza 2 (38 tools łącznie)
- `add_task` — dodaj zadanie do kroku projektu (task_order auto-increment)
- `add_decision_point` — dodaj diamencik decyzji (UAT/CR/odchylenie/inne)
- `get_raci` — odczytaj macierz RACI dla projektu (`!inner` join — poprawny filtr)
- `mark_project_completed` — zamknij projekt (status→completed, 404 gdy nie istnieje)
- `set_project_pms` — ustaw PM-ów (walidacja profili przed DELETE+INSERT)

### Dodano — Performance
- `cache()` na 5 data functions: `getProjectRisks`, `getProjectKpis`, `getProjectBudget`, `getProjectChangeRequests`, `getProjectRaci` — eliminuje 5 zduplikowanych DB queries per page load

### Naprawiono — layout
- **Sidebar sticky**: lewy pasek `h-screen sticky top-0` — stały, scroll tylko w `<main>` (prawa część)
- `key={project.id}` na `<ProjectViews>` — reset stanu między projektami przy nawigacji

### Naprawiono — review/security
- `get_raci !inner` — nie wyciekają dane innych projektów przez błędny PostgREST join
- `set_project_pms` — walidacja profili przed DELETE, brak stanu „zero PM-ów" przy błędzie
- `mark_project_completed` — 404 dla nieistniejącego projektu, before/after w activity_log
- Ujednolicony `verifyMcpToken` z `src/lib/mcp/auth.ts` w nowych MCP routes

### MCP tools łącznie: 38/40 (brakuje: `generate_document_content`, `add_steps_to_project`)

---

## [1.1.0] — 2026-06-18 — 🚀 PRODUKCJA: MCP Server Faza 1 (P3, D-032) + skill Claude

> Status: **ZMERGOWANE → produkcja** (`main`, `3566748`). Sesja 16.
> Główna ścieżka tworzenia projektów przez Claude jest teraz aktywna.

### Dodano — MCP Server (27 operacji)
- **Fundament auth:** tabela `api_tokens` (migracja wdrożona), `verifyMcpToken()` (Bearer token), `createMcpHandler()`, endpoint `/api/mcp/tokens`
- **7 READ tools:** `get_clients`, `get_projects`, `get_project_detail` (D-037 status), `get_tasks`, `get_step_templates`, `get_team_members`, `get_activity_log`
- **5 WRITE core:** `create_project` (R15 auto-insert), `update_task_status` (hidden sync), `set_task_owner`, `update_task`, `bulk_hide_tasks`
- **14 WRITE domain:** `add/update_risk`, `add/update_change_request`, `update_milestone`, `add/update_kpi`, `set_budget_settings`, `add/update_budget_line`, `add_stakeholder`, `add/update_question`
- **MEGA-TOOL:** `setup_project_full` — projekt + budżet + ryzyka + milestony + stakeholderzy + KPI w jednym wywołaniu
- **Smoke test** potwierdzony: create_project z R15 (10 faz, 49 zadań), add_risk, setup_project_full

### Dodano — Skill Claude `/bw-project-manager`
- Lokalny stdio MCP server (`~/.claude/bw-mcp/server.mjs`) zarejestrowany w Claude Code (`--scope user`)
- Skill z instrukcjami flow: potwierdzenie przed zapisem (R10), flow tworzenia projektu krok po kroku
- Token MCP wygenerowany dla konta mikolaj.marcinkowski@businessweb.pl

### Naprawiono
- Checklist fazy: zakładka zawsze widoczna (nie tylko po kliknięciu klocka)
- Checklist fazy: domyślnie otwiera pierwszą aktywną fazę projektu

### Server actions WRITE (aktualnie): 7/26 + 27 MCP tools

---

## [1.0.0] — 2026-06-17 — 🚀 PRODUKCJA: Faza 2c kompletna + 50 ulepszeń UX + edycja projektu/klienta

> Status: **ZMERGOWANE → produkcja** (`main`, `fe210a2`). Sesja 14.
> Pierwsza wersja z kompletnym widokiem projektu, interaktywnością zadań, edycją danych i pełnym UX polish.

### Dodano — edycja danych (CRUD kompletny)
- **Edycja projektu** — dialog w nagłówku projektu: nazwa, typy, PM, daty, opis (`updateProjectAction`, replace-all typów i PM-ów)
- **Edycja klienta** — dialog na stronie klienta: nazwa, NIP (walidacja 10 cyfr), link HubSpot (`updateClientAction`)
- `getProjectDetail` rozszerzony o pole `description`

### Dodano — P18 edycja terminu z potwierdzeniem
- Klikalny termin w Gantcie — modal z potwierdzeniem „change", historia zmian z `activity_log`, żółty alert ≤2 dni
- `daysUntilDue()` helper (spójny z `parseLocalDate`, brak skoku UTC/lokalna)
- `updateTaskDueDate` + `getTaskDateHistory` server actions

### Dodano — faza aktywna z zadań (fix architektoniczny)
- `is_active` i `status` fazy wyliczane z zadań zamiast z DB — kliknięcie „W toku" na zadaniu od razu podświetla fazę na Mapie klocków

### Dodano — 50 ulepszeń UX (przegląd 3-osobowy)

**Gantt / Harmonogram:**
- Sticky nagłówek tygodni przy scrollu
- „Typ" / „PM" zamiast „Kind" / „Own"
- Karta statystyk: „Zadania gotowe: N/M"
- Zwinieta faza: „N/M gotowe · Xh"
- Kliknięcie klocka → scroll do fazy w Harmonogramie (stepId przekazany)
- Filtr „Po terminie" przez kliknięcie karty statystyk
- Progress bar w ParallelView
- cursor-wait przy pending

**Nawigacja:**
- „Moje projekty" w sidebarze
- Breadcrumb 3-poziomowy: Teczki klientów / Klient / Projekt
- Link powrotu w archiwum
- Topbar tytuł dynamiczny
- Ostatnio otwarte projekty (localStorage, max 3)
- Etykieta „Wyloguj" na xl+

**Dashboard:**
- Data dnia (środa, 17 czerwca 2026)
- Liczniki portfela (N aktywnych projektów)

**Strona klienta:**
- Toggle Aktywne / Wszystkie

**Formularze:**
- Autofocus na Select klienta gdy nie ma presetu
- Błędy znikają przy poprawieniu pola
- Scroll do góry przy przejściu krok 1→2
- Info o zachowaniu N/A
- Wyższy kontener zadań w kroku 2
- Licznik per faza (X/Y aktywnych)
- Toast sukcesu po stworzeniu projektu
- Walidacja NIP (10 cyfr)

**Lista /projekty:**
- Szukaj po nazwie / kliencie (URL param ?q=)
- Sortowanie: termin ↑/↓, nazwa A-Z/Z-A
- Filtr PM (dropdown + „Moje projekty") — DB-side filter

**UI / komponenty:**
- `active:scale-[0.97]` na wszystkich przyciskach
- ProjectVisitTracker zapisuje do localStorage

### Server actions WRITE (aktualnie): 6/26
`createClientAction` · `updateClientAction` · `createProjectAction` · `updateProjectAction` · `updateTaskStatus` · `updateTaskAssignee` · `updateTaskDueDate`

---

## [0.9.0] — 2026-06-17 — 🚀 PRODUKCJA: Faza 2c (P7/P8/P9) + kreator krok 2 + testy penetracyjne + bugfixy

> Status: **ZMERGOWANE → produkcja** (`main`, commity `5defef6`…`e9d17a8`). Sesja 13.
> Największy release od 0.7.0 — interaktywne zadania + nowy wizard + naprawione 12 bugów ze 3 testów i feedbacku.

### Dodano — interaktywne zadania (Faza 2c)
- **P7 — StatusControl** (`updateTaskStatus`): klikalny dropdown w Gantcie (5 statusów: Plan/W toku/Gotowe/QA/N/D). Session-scoped client, whitelist statusu, audyt A4, `revalidatePath`.
- **P8 — AssigneeControl** (`updateTaskAssignee`): klikalny avatar inicjałów w kolumnie Own → Base UI Select z listą profili + „Brak osoby". Max 120 znaków, audyt A4.
- **P8 — completion_date chip**: data ukończenia `dd.MM.YYYY` widoczna pod statusem gdy zadanie `done`.
- **P9 — toggle „Pokaż N/A (N)"**: przycisk w toolbarze Ganttu gdy są ukryte zadania; ukryte zadania widoczne z `opacity-50 line-through` po kliknięciu.
- **P9 / D-056 — kreator krok 2**: formularz tworzenia projektu zmieniony na wizard 2-krokowy. Krok 2 pokazuje zadania które zostaną wstawione (R15 filtr), PM odznacza N/A przed zapisem → `hidden=true` od początku.
- `updateTaskStatus` synchronizuje `hidden`: zmiana na `na` → `hidden=true`; wyjście z `na` → `hidden=false`.
- `getProjectDetail` pobiera WSZYSTKIE zadania (hidden included) — Gantt steruje widocznością kliencko.
- `taskMatchesTypes` (predykat R15) wydzielony do `lib/utils.ts` (izolacja server/client).

### Naprawiono — testy penetracyjne (3 persony: Developer, Senior PM, Junior)
- `todayISO` przeniesiony wewnątrz `isOverdue()` — nie starzeje się po restarcie serwera produkcyjnego.
- Walidacja client-side: deadline < start_date + start < 2000-01-01 w kroku 1 kreatora.
- `align="start"` w Base UI Select (Status + Assignee) — dropdown nie ucina się przy prawej krawędzi Gantta.
- `router.refresh()` przed `router.push()` po stworzeniu projektu — lista projektów świeża bez ręcznego odświeżania.
- Custom `not-found.tsx` — polska 404 w layoucie `(app)/` + root fallback.
- `maxLength={200}` na polu nazwy projektu.

### Naprawiono — feedback narzędzia inspekcji
- Kartki `FolderGlyph` w dark mode: `oklch(0.30/0.38)` → `oklch(0.82/0.94)` — papier biały/jasny jak oczekiwał użytkownik.

### Naprawiono — odłożone (deferred)
- `showHidden` auto-reset: `useEffect` gdy `hiddenTaskCount === 0` — toggle P9 zamyka się sam gdy nie ma N/A zadań.
- `getClientWithProjects` owinięty `cache()` — eliminuje podwójne zapytanie DB per request.
- Zakładki RACI/RAID/Budżet/KPI: klikalne → empty state „dostępne wkrótce" zamiast cichego braku reakcji.
- Phase strip: gradient fade + cienki scrollbar WebKit (3px) — wskazuje że można scrollować w prawo.

### Jakość
- code-reviewer (0 P0/P1) + security-auditor (0 CRITICAL/HIGH, LOW zastosowane) na każdym większym kawałku.
- 3-persona pen test (Developer/Senior PM/Junior) przez `ui-ux-tester` subagenty.
- TSC czysty, prod build OK, E2E zielony przez cały cykl.
- Decyzja architektoniczna: **D-056** (kreator krok 2 + semantyka hidden=true).

### Serwer actions WRITE (aktualnie): 4/26
`createClientAction` · `createProjectAction` · `updateTaskStatus` · `updateTaskAssignee`

---

## [0.8.0] — 2026-06-16 — Faza 2c (START): interaktywne zadania — odhaczanie statusów (branch)

> Status: **WCHŁONIĘTE w 0.9.0** (zmiany trafiły na `main` via `feat/task-config-creation`). Branch `feat/faza-2c-zadania` historyczny.

### Dodano
- **`updateTaskStatus`** (server action) — zmiana statusu zadania (P7) z RLS sesji usera (R13), whitelist statusu, `completion_date` przy „Gotowe" (P8), audyt `activity_log` (A4).
- **TaskStatusControl** — klikalny status w Gantcie (Base UI Select, 5 statusów), useTransition + refresh.

### Jakość
- code-reviewer (0 P0/P1) + security-auditor (bezpieczne w R1/R13, 0 high/krit) + detektor `[]`. E2E: zmiana statusu persystuje.
- Ślady na V2 (LOW): integralność `activity_log` w DB, rate-limit server actions.

### Następne plasterki 2c
- P8 (owner + completion UI), P9 (ukrywanie N/A + „Pokaż N ukrytych"), P18 (edycja dat z potwierdzeniem), P19 (wyciszanie), ekran „Checklist fazy" (ekran 7).

---

## [0.7.0] — 2026-06-16 — Faza 2b: widok projektu = Mapa klocków + phase strip + wierny Gantt

> Status: **ZMERGOWANE → produkcja** (merge `6dcd79e`, 2026-06-16). W 2b dodatkowo: ekran „Mapa klocków + phase strip" (główny widok), wierny task-level Gantt (ciemny header, paski wg kind, zwijalne fazy, ciągła linia „dziś"), Krok 0 (impeccable wpięty w design), QA Playwright (5 projektów), krytyka impeccable + code-reviewer.

### Dodano
- **Widok projektu** `/projects/[id]` (P5/P6/P11/P12): nagłówek + **wykres Gantt** na realnym kalendarzu
- Oś CSS-grid (kolumna/tydzień), realne daty lub względne `T1..N`, **linia „dziś"**, **auto-scroll do aktywnego kroku**
- Klocki faz wg statusu + **„Tu jesteś"** (teal); **rozwijanie krok→zadania**; **kolumna etykiet sticky-left**
- **Kamienie** (romby) + **decyzje P11** (romby obrysowane) + legenda; tagi ∥równolegle / cykliczny
- Data layer `getProjectDetail` (cache); włączone linki wierszy projektów (`/projekty`, `/clients/[id]`)

### Jakość / przeglądy
- code-reviewer (0 P0, wzór grid tydzień→kolumna potwierdzony) + impeccable critique (ui-designer) + detektor `[]`
- Wdrożone uwagi: cache, niesymetryczne tygodnie, logi błędów, decyzje bez kroku, a11y, auto-scroll, sticky etykiety, kontrast dark, czytelność zadań
- Komponenty UI + poprawki budowane przez subagentów (`react-specialist`); wzór grid i integracja weryfikowane inline
- Zweryfikowane: tsc, prod build, E2E (nawigacja + render jasny/ciemny + rozwijanie + auto-scroll), zero błędów konsoli

### Dane
- ⚠️ Projekt testowy na produkcji zseedowany jako DEMO (za zgodą): „Kaufland — Wdrożenie CRM (DEMO Gantt)" — realny harmonogram, aktywny krok, kamienie, decyzja

### Następna wersja (0.8.0)
- Faza 2c: interaktywne zadania (P7 statusy, P8 owner+completion, P9 ukrywanie, P10 alerty) + edycja dat (P18, drag + potwierdzenie)

---

## [0.6.0] — 2026-06-16 — 🚀 PRODUKCJA: merge Faza 2a → main + delight + security

> Status: **ZMERGOWANE do `main`** (merge `81e9197`) → **auto-deploy Production** (`bw-project-manager.vercel.app`).
> Pierwsze wdrożenie Fazy 2a na produkcję. Faza spec + Faza 1 + Faza 2a żywe online.

### Wdrożono na produkcję
- **Faza 1:** auth (login + `proxy.ts` + DAL), design BW (tokeny, jasny/ciemny), shell, inspekcja, logo
- **Faza 2a:** tworzenie klienta (P1) + projektu z auto-insertem R15 (P2); dashboard teczkowy + czerwony trójkąt (P13);
  /projekty + filtry (P14); /clients/[id] (P4); /archiwum (placeholder)

### Dodano (sesja 12)
- **Obejście logowania dev** (`feat(login)` `3ed0a2c`): przyciski „Wejdź jako Admin/User" na /login — TYLKO lokalnie
  (gate fail-closed `NODE_ENV==='development'`); w produkcji nieobecne (ani markup, ani działająca akcja). Konta dev
  `dev-admin`/`dev-user@bwmanager.pl`, creds tylko w `.env.local` (nie w Vercel).
- **Delight UI** (`feat(ui)` `33625a6`): teczka **otwiera się na hover** (klapka 3D + kartki), kaskadowe wejścia
  kafelków/wierszy (reduced-motion-safe), animowany theme-toggle. Papier teczki adaptywny do motywu.

### Bezpieczeństwo
- ✅ **Leak domknięty:** hasło konta `mikolaj.marcinkowski@businessweb.pl` **zrotowane** (Auth Admin API) — stare martwe.
  (Mikołaj: oznaczyć alert GitHub „revoked".)
- Dev-login zweryfikowany jako nieobecny w prod buildzie (markup + grep `.next`); `.env.local`/`.env.e2e` gitignored.

### Jakość / przeglądy
- code-reviewer + security-auditor (dev-login: 0 P0/P1) + impeccable critique (delight) + detektor `[]`
- Zweryfikowane: tsc, prod build, E2E (hover jasny+ciemny, reduced-motion opacity=1), zero błędów konsoli

### Decyzje
- **D-053:** obejście logowania dev tylko lokalnie (gate NODE_ENV) · **D-054:** edytowalne typy wdrożeń → ekran Ustawień (odłożone)

### Następna wersja (0.7.0)
- Faza 2b: widok projektu = Gantt + klocki + „tu jesteś" (P5/P6/P11/P12)

---

## [0.5.0] — 2026-06-15 — Upiększanie UI (foldery) + security (leak creds)

> Status: zmergowane do `main` w 0.6.0 (2026-06-16). ✅ Rotacja hasła konta WYKONANA (patrz 0.6.0).

### Zmieniono (UI — impeccable)
- Teczki klientów jak **foldery** (asset Tabler Icons MIT, `public/folder.svg`, tintowany teal) zamiast CSS-zakładki
- Micro-interakcje (hover-lift, press, focus teal, 0.2s ease-out); bogatszy pusty stan dashboardu
- A11y: token `--teal-strong` (ciemniejszy, WCAG AA) na mały tekst teal; `--teal` na ikony/bordery

### Bezpieczeństwo
- 🔴 Wykryto leak (GitHub secret scanning): email+hasło konta zahardkodowane w `scripts/e2e.mjs` (commit `21bf0a4`)
- Naprawione: creds z env (`0a2f43d`). Zakres wąski — `.env.local`/klucze NIE wyciekły.
- **OTWARTE:** rotacja hasła konta (stare w historii gita) — do zrobienia na start

### Commity sesji 11
`8df0adc` fix bugów UI · `fd0a1f3` fix QA · `21bf0a4` E2E harness (LEAK) · `d95810b` docs ·
`0a2f43d` security(e2e) · `b354cdb` upiększanie+foldery

---

## [0.4.0] — 2026-06-15 — Faza 2a: klient/projekt + dashboard teczkowy (branch, do mergu)

> Status: zmergowane do `main` w 0.6.0 (merge `81e9197`, produkcja). [0.4.0]/[0.5.0] to notatki WIP z brancha.

### Dodano
- Tworzenie klienta (P1) + projektu z auto-insertem R15 wg typów wdrożenia (P2)
- Dashboard teczkowy + czerwony trójkąt zagrożenia (P13); /projekty + filtry (P14); /clients/[id] (P4); /archiwum (placeholder)
- Walidacja serwerowa (daty, hubspot_url, enum); `revalidatePath`; dynamiczny tytuł topbara

### Naprawiono (testy: qa-expert + E2E Playwright)
- Błąd Base UI button (render=Link → nativeButton=false); Select pokazuje nazwę nie UUID; checkmark na typach
- atRisk/P13 działa (end_date<dziś); „Bez PM" bez fallbacku; walidacja dat; składnia enum w zapytaniu

### Testy
- E2E `scripts/e2e.mjs` (Playwright): wszystkie kroki ✅, zero błędów konsoli; R15 end-to-end potwierdzone
- Nauczka: stale-cache dev (czarny `--primary`) → restart dev rozwiązuje (CSS był OK)

### Następna wersja (0.5.0)
- „Upiększanie" UI przez impeccable (foldery, micro-interakcje, edytowalne typy) → potem merge 2a→main

---

## [0.3.0] — 2026-06-15 — Faza 1: UI (login + shell + inspekcja) + logo + hardening

### Dodano
- **Auth UI:** ekran logowania (Supabase email+hasło), `src/proxy.ts` ochrona tras, DAL (getSessionUser/requireUser/requireAdmin)
- **Design BW:** tokeny OKLCH (orange=akcja, teal=struktura, statusy RAG), czcionki Montserrat/Lexend Deca/Space Grotesk, tryb jasny/ciemny (next-themes)
- **Shell:** sidebar (Dashboard/Projekty/Archiwum) + topbar (theme toggle + logout), dashboard z pustym stanem
- **Narzędzie inspekcji** dla testerów (`ui_feedback`): klik elementu → ścieżka CSS + kontekst → zapis do bazy; Escape/aria/focus
- **Logo BusinessWeb:** kolorowe (jasny) + białe (ciemny), przełączane CSS — login + sidebar
- **Konto admina** Mikołaja (dev_admin + tester) przez Auth Admin API

### Bezpieczeństwo (po audycie)
- Trigger blokujący self-escalation roli/is_tester; handle_new_user zaszywa 'user'; rejestracja wyłączona
- open-redirect (backslash) odrzucany; walidacja serwerowa feedbacku; brak wycieku błędów DB

### Jakość
- Przeglądy: code-reviewer + security-auditor + impeccable critique (detektor czysty); polskie znaki w całym copy
- Patterny budowy spisane w `CLAUDE.md` (sekcja „Patterny i konwencje")

### Status
✅ Faza 1 działa lokalnie (login → dashboard → inspekcja). Branch `feat/db-foundation-auth`.

### Następna wersja (0.4.0)
- Faza 2a: tworzenie klienta/projektu (auto-insert zadań wg typów) + dashboard z realnymi teczkami (P1,P2,P13,P14)

---

## [0.2.0] — 2026-06-15 — Fundament: schemat DB + seed + plumbing auth

### Dodano
- **Schemat bazy (29 tabel)** wdrożony na Supabase (PG17) — migracje `supabase/migrations/`:
  - core (projects bez pm_id/active_step_id, project_pms m:n, project_types, tasks wzbogacone),
    encje dokumentów BW (CR/RAID/budget/KPI/milestones/stakeholders/governance/maintenance), activity_log
  - RLS wg R13 (każdy zalogowany = pełny dostęp), `is_admin()`/`current_user_role()`, trigger auto-`profiles`
- **Seed szablonów (D-052):** 13 step_templates (FAZA 0–8 + Sprint 2 + 3 cykliczne) + 86 step_task_templates
  (z `raw/00_harmonogram.html`, skrypt `scripts/gen-seed.mjs`)
- **Typy TS** `src/types/supabase.ts` (gen types)
- **Plumbing auth Next 16:** `src/proxy.ts` (proxy zastępuje middleware), `update-session.ts`, `dal.ts`

### Naprawiono
- `proxy.ts` przeniesiony root → `src/proxy.ts` (w roocie był cicho ignorowany — app w src/)

### Zmieniono
- Dokumentacja: workflow Supabase non-TTY (INFRASTRUCTURE/CLAUDE), reconciliacja D-052 (war-room, data-model)

### Status
✅ Fundament danych + auth gotowy i zweryfikowany E2E (next build OK, proxy wykryty). Branch `feat/db-foundation-auth`.

### Następna wersja (0.3.0)
- Brandowy UI Fazy 1: tokeny BW + theme toggle + shell (sidebar/topbar) + login (skill `impeccable`)

---

## [0.1.0] — 2026-06-15 — Faza 0: Infrastruktura

### Dodano
- Next.js 16.2.9 App Router + TypeScript + Tailwind CSS + shadcn/ui
- Supabase klient: browser / server / admin (`src/lib/supabase/`)
- Pełna konfiguracja infrastruktury:
  - GitHub: `github.com/mikolajmarcinkowski-bw/bw-project-manager`
  - Vercel: `bw-project-manager.vercel.app` (12 env vars)
  - Supabase: projekt `ipptnszwnjtoqpixhefd` (West EU London)
  - Resend: `brief@bwmanager.pl` (daily brief email)
- Dokumentacja: `CLAUDE.md`, `INFRASTRUCTURE.md`, `WAR_ROOM_MAP.md`, `DEV_LOG.md`

### Status
✅ Infrastruktura gotowa — można zaczynać budowę funkcji

### Następna wersja (0.2.0)
- Supabase Auth (login, middleware, chronione trasy)
- Migracje DB (pełny schemat z war-rooma)
- Shell aplikacji (layout, sidebar, routing)
- Dashboard teczkowy (P13)

---

## [0.0.1] — 2026-06-15 — Init

### Dodano
- Inicjalizacja projektu i struktury dokumentacji
