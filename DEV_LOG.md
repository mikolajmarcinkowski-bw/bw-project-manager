# DEV_LOG — Szczegółowy log pracy (AI pisze, Mikołaj czyta)

> Format wpisu: `[YYYY-MM-DD HH:MM] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`
> Zasada: tyle szczegółów żeby wznowić pracę "na zimno" bez pytania o kontekst.

---

## [2026-06-15] setup | Inicjalizacja folderu budowy

**Co:** Utworzono strukturę folderu `DeliveryApp - build/` jako root repozytorium Next.js.
**Pliki:** `CLAUDE.md`, `INFRASTRUCTURE.md`, `WAR_ROOM_MAP.md`, `DEV_LOG.md`, `CHANGELOG.md`, `.env.local.example`
**Status infrastruktury:** GitHub ✅ konto | Supabase ⏳ | Vercel ⏳ | Resend ⏳
**Następny krok:**
1. Mikołaj podaje GitHub username → AI tworzy repo przez `gh repo create`
2. Mikołaj zakłada konto Supabase → tworzy projekt → podaje URL + klucze
3. AI inicjalizuje Next.js: `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
4. AI dodaje shadcn/ui, konfiguruje Supabase client
5. Mikołaj łączy Vercel z GitHub repo

---
