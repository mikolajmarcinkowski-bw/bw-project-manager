# DEV_LOG — Szczegółowy log pracy

> Format: `[YYYY-MM-DD] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`

---

## [2026-06-15] review + ui | Przeglądy subagentami (zasada Mikołaja) + tokeny BW + poprawki bezpieczeństwa

**Nowa twarda zasada (CLAUDE.md pkt 7):** po każdym większym fragmencie → `code-reviewer`; okresowo → `security-auditor`.

**Tokeny designu (subagent nextjs-developer):** globals.css paleta BW (OKLCH, light+dark), czcionki
Montserrat/Lexend Deca/Space Grotesk, next-themes (jasny domyślny + ciemny toggle), theme-provider + theme-toggle.
Tokeny: `--color-primary`=orange (akcja), `--color-teal` (struktura), `--color-status-{on,at,off,quality}`, `--color-rev-green`. tsc/build OK.

**Przegląd kodu (code-reviewer) — naprawione:**
- 🟠 `update-session.ts`: redirect zalogowany→/login gubił odświeżone cookies (ryzyko losowych wylogowań) → kopiuję cookies do response.
- 🟡 brak `unique(phase_number, step_order)` na step_templates (chroni cross-join seeda) → dodane w migracji.
- 🟢 (odłożone, drobne): martwa `current_user_role()`, nieużywane `--font-meta/--font-heading`, brak `--destructive-foreground` → przy UI shell.

**Audyt bezpieczeństwa (security-auditor) — naprawione w migracji `20260615120400_security_hardening.sql`:**
- 🔴 KRYTYCZNE: self-escalation — każdy user mógł `update profiles set role='dev_admin'` (RLS nie widzi OLD).
  Fix: trigger `protect_profile_privileges` blokuje zmianę role/is_tester dla nie-adminów (auth.uid() IS NULL = kontekst zaufany).
- 🔴 `handle_new_user` ufał `raw_user_meta_data.role` → zaszyte 'user'.
- Obrona w głębi: `config.toml` enable_signup=false (UWAGA: to lokalne — prod ustawia się w dashboardzie Supabase).
- 🟢 forward-looking: `/api/*` poza ochroną proxy — każda przyszła trasa API MUSI sama auth (twardy wymóg Fazy 3 / MCP).

**Status:** poprawki lokalne gotowe, tsc czysto. ⏳ Migracja bezpieczeństwa CZEKA na zgodę Mikołaja na deploy
(auto-deploy zablokowany przez classifier — słusznie). Po deployu: commit + dalej UI (login/shell/inspekcja).

---

## [2026-06-15] db + checkpoint | Seed szablonów wdrożony + build OK + reconciliacja docs (D-052)

**Seed (task #3 ZAMKNIĘTE):** `scripts/gen-seed.mjs` ekstrahuje tablicę `TASKS` z `raw/00_harmonogram.html`
→ migracja `20260615120200_seed_templates.sql`. Wdrożone + zweryfikowane na żywej bazie (REST count):
**13 step_templates** (10 faz FAZA 0–8 + Sprint2 + 3 klocki cykliczne) + **86 step_task_templates**
(suma est 431h). Mapowanie typów (CRM/SPO/INT/MKT/ERP) z pól type/note harmonogramu — 12 wierszy
wielo-typowych zweryfikowanych. Konwencja R15 udokumentowana w migracji: `applies_to_types='{}'` = wszystkie.

**Fix z review (advisor):** `proxy.ts` przeniesiony root → **`src/proxy.ts`** (app jest w src/ → root był
CICHO ignorowany, zero ochrony tras). Zweryfikowane: `next build` listuje `ƒ Proxy (Middleware)`, `tsc --noEmit` OK.

**Decyzja D-052 (brak Master Excela):** Mikołaj potwierdził — „Master Excel" Oli nie powstanie.
Harmonogram 9-fazowy = finalny kanon struktury + mapowania typów (domyka D-051).

**Reconciliacja dokumentacji war-roomu** (instrukcja Mikołaja „pełna aktualność"; twarda zasada cross-refów):
- `wiki/technical/decisions.md` → dodane **D-052**
- `product-specs/.../04-spec.md` (GŁÓWNY PRD) → V2 backlog: usunięty „wielki Excel", nota D-052
- `wiki/process/bw-process-matrix.md` → baner D-052 + „Pogodzenie faz" przepisane + otwarte pytania zamknięte
- `wiki/product/questions-for-delivery.md` → „Wielki Excel" zamknięty
- `STATUS.md` → snapshot build + bloker „Wielki Excel" zamknięty
> Uwaga: war-room jest poza repo gita (folder nadrzędny) — zmiany docs zapisane na dysku (OneDrive), nie w commicie.

**Stan:** fundament danych + auth kompletny i zweryfikowany E2E. Następne: brandowy UI Fazy 1 przez `impeccable`.

---

## [2026-06-15] db + deploy | Schemat WDROŻONY i zweryfikowany na żywej bazie ✅

**Deploy:** `supabase login --token` (login interaktywny NIE działa w non-TTY!) → `link --password`
→ `db push --password`. Obie migracje zaaplikowane bez błędów (jedyny NOTICE: pgcrypto już istniał).
Postgres 17, region eu-west-2.

**Weryfikacja:** `gen types typescript` → `src/types/supabase.ts` (1562 linie). Potwierdzone **wszystkie 29 tabel**
+ funkcja `current_user_role`. Schemat zgodny z kontraktem MCP (test akceptacyjny przeszedł na etapie pisania).

**Dokumentacja zaktualizowana** (prośba Mikołaja): `INFRASTRUCTURE.md` + `CLAUDE.md` — sprawdzony workflow
Supabase dla non-TTY (login tokenem ze schowka, hasło DB przez flagę `--password`, brak Dockera → praca
na zdalnej bazie, `db reset`/lokalny stack niedostępne).

**Stan:** Tasks #1 (schemat) + #2 (CLI/push) ZAMKNIĘTE. Następne: task #3 (seed szablonów — wymaga
przeczytania `bw-process-matrix.md` + `raw/00-09`), potem brandowy UI Fazy 1 przez `impeccable`.

**NIE commitowane jeszcze** — czeka na decyzję Mikołaja (branch vs main; auto-deploy Vercel z GitHub
jeszcze nieskonfigurowany). Pliki w working tree: migracje, `src/types/supabase.ts`, plumbing auth
(`proxy.ts`, `update-session.ts`, `dal.ts`), zaktualizowane docs.

---

## [2026-06-15] db + blocker | Schemat DB napisany (DDL + RLS) — czeka na deploy (credentiale)

**Co zrobiono:**
- `supabase init` → katalog `supabase/` + `config.toml`
- Migracja `20260615120000_init_schema.sql` — pełny schemat DDL: 21 enumów, 29 tabel
  (profiles, team_members, clients, projects, project_pms, project_types, step_templates,
  step_task_templates, project_steps, tasks, decision_points, project_documents, change_requests,
  risks, milestones, kpis, budget_settings, budget_lines, task_role_assignments, stakeholders,
  escalation_levels, meetings, communications, questions_doubts, maintenance_packages,
  ai_project_suggestions, external_refs, working_calendar, activity_log) + indeksy + trigger updated_at.
- Migracja `20260615120100_rls_and_triggers.sql` — RLS (R13: każdy zalogowany = pełny dostęp do
  danych projektów; szablony/pula/kalendarz read-all + write-admin; activity_log read+insert),
  funkcje `current_user_role()`/`is_admin()` (SECURITY DEFINER, bez rekursji), trigger
  `handle_new_user()` auto-tworzący `profiles` na insert do `auth.users`.

**Reconcyliacja modelu (wg advisora):** kanon = nowy model (PRD §6 + rewizje D-051), NIE stara treść
`data-model.md`. Kształt encji core z PRD §6 + rewizje; detal kolumn encji-dokumentów z treści
`data-model.md`; nazwy pól zadań z `mcp-tools.md`. Jedna wzbogacona tabela `tasks` (FK `project_steps`),
checklist zwinięty w nią. `projects` BEZ `pm_id`/`active_step_id`; PM-owie przez `project_pms` (m:n);
aktywność klocków przez `is_active`; typy przez `project_types`.

**Test akceptacyjny:** przeszedłem WSZYSTKIE tool e MCP (`mcp-tools.md`) — każdy parametr ma kolumnę.
Załatane 2 luki: `project_steps.kind` (add_steps_to_project) + `change_requests.notes` (update_change_request).

**BLOKER (deploy):** push migracji wymaga credentiali, które ma tylko Mikołaj:
1. `supabase login` (browser) LUB `SUPABASE_ACCESS_TOKEN`
2. hasło DB Supabase (do `supabase link` / `db push`)
Brak Dockera/`psql` → nie da się zwalidować lokalnie. SQL przejrzany manualnie, nie uruchomiony.

**Plumbing auth (Faza 1, nie-DB, zrobione w międzyczasie — czysta mechanika Next 16):**
- ⚠️ Next 16 breaking: `middleware.ts` → **`proxy.ts`** (default/named export `proxy`, runtime Node.js);
  `cookies()` jest **async**. Sprawdzone w `node_modules/next/dist/docs` (wymóg AGENTS.md).
- `src/lib/supabase/update-session.ts` — odświeżanie sesji w proxy (wzorzec @supabase/ssr getAll/setAll),
  ochrona tras (publiczne: /login, /auth/*; reszta → redirect /login z ?redirectTo).
- `proxy.ts` (root) — wpina updateSession + matcher (pomija api/_next/assety).
- `src/lib/auth/dal.ts` — DAL: getSessionUser / requireUser / requireAdmin (czyta rolę z `profiles`,
  React `cache`). Wzorzec z docs: auth blisko źródła danych, nie w layoutach.

**Następny krok:** Mikołaj loguje CLI + podaje hasło DB → `supabase link --project-ref ipptnszwnjtoqpixhefd`
→ `db push` → `gen types` do `src/types/supabase.ts`. Potem: weryfikacja schematu, seed szablonów (task #3),
brandowy UI Fazy 1 (tokeny BW + shell + login) przez skill `impeccable` (D-050).
Migracje + plumbing NIE są jeszcze commitowane (migracje czekają na weryfikację deploymentem).

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
