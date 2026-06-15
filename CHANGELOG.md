# CHANGELOG — Historia wersji

> Aktualizuj po każdym deployu lub ukończonej fazie.

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
