# DEV_LOG — Szczegółowy log pracy (AI pisze, Mikołaj czyta)

> Format wpisu: `[YYYY-MM-DD HH:MM] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`
> Zasada: tyle szczegółów żeby wznowić pracę "na zimno" bez pytania o kontekst.

---

## [2026-06-15] deploy | Pierwszy deploy na Vercel produkcja ✅

**Co:** Next.js 14 App Router + shadcn/ui zbuildowany i wdrożony.
**URL:** https://bw-project-manager.vercel.app
**Vercel projekt:** mikolaj-marcinkowski-s-projects/bw-project-manager
**GitHub repo:** github.com/mikolajmarcinkowski-bw/bw-project-manager (main branch)
**Stack:** Next.js 16.2.9, TypeScript, Tailwind, shadcn/ui — build OK, 4 strony statyczne
**Do zrobienia:**
- ⚠️ Vercel→GitHub auto-deploy: zainstalować GitHub App przez vercel.com/dashboard → projekt → Settings → Git
- ⏳ Supabase: założyć projekt, podać klucze
- ⏳ Resend: założyć konto, podać API key
**Następny krok:** Supabase setup → schema DB → Supabase klient w Next.js

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
