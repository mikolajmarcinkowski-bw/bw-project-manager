# DEV_LOG — Szczegółowy log pracy

> Format: `[YYYY-MM-DD] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`

---

## [2026-06-15] checkpoint | Faza 0 ukończona — cała infrastruktura gotowa ✅

**Status infrastruktury:**
- ✅ GitHub: `github.com/mikolajmarcinkowski-bw/bw-project-manager` (private, branch: main)
- ✅ Vercel: `bw-project-manager.vercel.app` — 2 deploye produkcyjne OK
- ✅ Supabase: `ipptnszwnjtoqpixhefd.supabase.co` (West EU London) — projekt założony, klucze skonfigurowane
- ✅ Resend: klucz w `.env.local` + Vercel env vars
- ✅ Vercel env vars: 12 zmiennych (Supabase URL/anon/service_role, Resend key/from, App URL) dla production + development

**Co jest w repo (main, commit fa56055):**
- Next.js 16.2.9 App Router + TypeScript + Tailwind CSS + shadcn/ui
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server component client (SSR z cookies)
- `src/lib/supabase/admin.ts` — admin client (service_role, tylko server-side)
- `.env.local` — kompletny (wszystkie klucze wypełnione)
- `CLAUDE.md`, `INFRASTRUCTURE.md`, `WAR_ROOM_MAP.md`, `DEV_LOG.md`, `CHANGELOG.md`

**Czego BRAKUJE (następne kroki):**
1. Supabase Auth setup (middleware, login page, protected routes)
2. Migracje DB — schema z `WAR_ROOM/wiki/technical/data-model.md`
3. Seed szablonów (9-fazowa struktura dla 5 typów: CRM/SPO/INT/MKT/ERP)
4. Shell aplikacji (layout, sidebar nav, topbar)
5. Dashboard teczkowy (P13)

**Następny krok (Faza 1):**
- Zainstaluj Supabase CLI: `npx supabase login` → `npx supabase link --project-ref ipptnszwnjtoqpixhefd`
- Napisz migracje z `WAR_ROOM/wiki/technical/data-model.md`
- Dodaj Supabase Auth middleware (chronione trasy)
- Zbuduj shell: sidebar nav + layout

**Ostrzeżenia dla AI:**
- `sed -i ''` nie działa ze spacją w ścieżce — używaj Pythona do edycji `.env.local`
- GitHub token działa przez `~/.git-credentials` (skonfigurowany)
- Vercel deploy: `cd "DeliveryApp - build" && npx vercel --prod --yes`

---

## [2026-06-15] deploy | Drugi deploy produkcyjny — Supabase klient

**Co:** Dodano `@supabase/supabase-js` + `@supabase/ssr`, 3 klienty w `src/lib/supabase/`.
**Build:** OK, 4 strony statyczne, TypeScript bez błędów.
**URL:** https://bw-project-manager.vercel.app

---

## [2026-06-15] setup | Inicjalizacja folderu budowy + pierwszy deploy

**Co:** Next.js 16.2.9 + shadcn/ui + git init + push na GitHub + deploy Vercel.
**URL produkcji:** https://bw-project-manager.vercel.app
**Commit:** 82c5cfa
