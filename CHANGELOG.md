# CHANGELOG — Historia wersji

> Aktualizuj po każdym deployu lub ukończonej fazie.

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

> Status: na branchu `feat/faza-2a-projekty`, NIEZMERGOWANE do `main` (brak deployu prod).

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
