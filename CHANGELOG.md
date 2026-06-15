# CHANGELOG — Historia wersji

> Aktualizuj po każdym deployu lub ukończonej fazie.

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
