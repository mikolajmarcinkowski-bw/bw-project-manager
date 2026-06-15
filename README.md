# BW Project Manager

Wewnętrzne narzędzie zespołu Delivery BusinessWeb do prowadzenia ~30 projektów wdrożeniowych
(HubSpot / integracje) jednocześnie. Kontrolna wieża: klient → projekt → Gantt z klockami faz
i markerem „tu jesteś" → zadania. Setup projektu przez rozmowę z Claude (MCP). Poranny brief mailem.
**Wyłącznie wewnętrzne** — brak kont klientów.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres+Auth+Storage+RLS) · Vercel · Resend.
> ⚠️ Next 16: `proxy.ts` (w `src/`) zamiast `middleware.ts`, `cookies()` async, Tailwind v4 CSS-first. Czytaj `node_modules/next/dist/docs/` przed kodem Next.

## Uruchomienie (dev)
```bash
npm install
npm run dev   # http://localhost:3000
```
Wymaga `.env.local` (Supabase URL/anon/service_role, Resend, App URL) — nie w repo. Logowanie: konto zakłada admin (rejestracja wyłączona).

## Dokumentacja (czytaj na start każdej sesji)
| Plik | Co |
|------|-----|
| `CLAUDE.md` | Zasady pracy + **„Patterny i konwencje z budowy"** (jak tu pracujemy) |
| `DEV_LOG.md` | Kronika pracy (najnowsze na górze) |
| `INFRASTRUCTURE.md` | Stan infrastruktury + workflow Supabase (non-TTY) |
| `CHANGELOG.md` | Wersje |
| `WAR_ROOM_MAP.md` | Mapa war-roomu (spec, decyzje, model danych) — w folderze nadrzędnym |

**Gdzie jesteśmy / jak wznowić:** `WAR_ROOM/STATUS.md` (sekcja „Jak wznowić na zimno").
Główny PRD: `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/04-spec.md`.

## Stan
Faza 1 ukończona (auth + shell + dashboard + narzędzie inspekcji + logo). Branch `feat/db-foundation-auth`.
Następne: Faza 2 (tworzenie klienta/projektu, widok projektu z Ganttem).
