# DEV_LOG — Szczegółowy log pracy

> Format: `[YYYY-MM-DD] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`

---

## [2026-06-15] test+fix | Testy integracyjne Fazy 2a (E2E Playwright) + naprawy bugów z testów

**Naprawione bugi zgłoszone przez Mikołaja + qa-expert** (commity 8df0adc, fd0a1f3):
- Button(render=Link) → nativeButton=false (zniknął błąd Base UI w konsoli)
- Select PM/klient: nazwa zamiast UUID (children-as-function); checkmark na typach (peer-checked)
- /archiwum: placeholder zamiast 404; atRisk/P13 działa (też end_date<dziś); „Bez PM" bez fallbacku;
  walidacja dat (deadline≥start, min 2000); hubspot_url schemat; dynamiczny tytuł topbara; CTA w /projekty

**E2E (Playwright headless Chromium na localhost, `scripts/e2e.mjs`, commit 21bf0a4):** wszystkie kroki ✅
(login, ochrona tras, /projekty, formularz, klik typu=zaznacza, PM=nazwa, tryb ciemny, inspekcja),
**ZERO błędów konsoli**. R15 potwierdzone end-to-end (Kaufland/SPO+ERP → 10 klocków/51 zadań).

**⚠️ WAŻNA NAUCZKA:** „czarny przycisk / smutny UI" = **nieświeży cache dev serwera** (HMR tokenów
Tailwind v4 `@theme` zawiódł po wielu edycjach/przełączeniach brancha — `--primary` renderował się
jako prawie-czerń mimo poprawnego CSS). Fix: `pkill -f "next dev"` + `rm -rf .next/dev .next/cache` +
restart. Po restarcie brand orange #F94213 renderuje się poprawnie. **Gdy kolory wyglądają źle w dev — restart.**

**Następne:** przebieg „upiększania" przez `impeccable` (teczki jak foldery, micro-interakcje/feeling klikania,
bogatsze stany, edytowalne typy wdrożeń) + odłożone a11y (kontrast teala, semantyczna tabela).

---

## [2026-06-15] feat | Faza 2a — tworzenie klienta/projektu + dashboard teczkowy (branch feat/faza-2a-projekty)

**Zbudowane (2 subagenci równolegle):** backend (createClientAction P1, createProjectAction + auto-insert R15 P2,
data/projects.ts: getClientsWithStats/getAllProjects/getProfiles/getClientWithProjects, atRisk) + UI
(/dashboard teczki+trójkąt P13, /projekty + filtry P14, /clients/[id] P4, /projects/new formularz P2, dialog klienta P1).
Komponenty clients/* projects/*; shadcn dialog/input/label/select. Commit checkpoint `ea4fab3`, next build OK.

**Przeglądy (detektor czysty; code-reviewer + impeccable critique):**
- ✅ Naprawione: `revalidatePath` w akcjach (nowy klient/projekt nie pokazywał się bez reloadu); sortowanie
  zagrożonych teczek na górę + mocniejszy sygnał trójkąta + etykieta „Zagrożony" (P13); focus-visible na pillach
  typów; PM „— Bez PM —" zamiast cichego preselectu; gwiazdki wymagalności `status-off`→`destructive`; ⚠ emoji→ikona lucide.
- ⏳ ODŁOŻONE (do decyzji/następnej iteracji): **kontrast teala jako tekst (WCAG AA ~2.6:1)** — decyzja tokenowa/brandowa
  (brand teal vs ciemniejszy wariant na małym tekście); **div-tabela /projekty → semantyczna `<table>`/role**; **tytuł
  topbara per-trasa** (statyczny „Dashboard"); natywny `<select>` filtrów → shadcn Select; martwy param `filters` w getAllProjects.

**Następne:** Faza 2b (widok projektu = Gantt + klocki + „tu jesteś", P5/P6/P11/P12). + rozważyć odłożone P1/P2 wyżej.

---

## [2026-06-15] checkpoint | KONIEC SESJI 10 — Faza 1 ukończona, dokumentacja zaktualizowana

**Co osiągnięto dziś (fundament → Faza 1, wszystko na produkcji/branchu `feat/db-foundation-auth`):**
1. Schemat DB: 30 tabel + RLS (R13) + seed (13/86 z harmonogramu 9-faz) — wdrożone + zweryfikowane (gen types + sondy REST).
2. Hardening bezpieczeństwa (po security-auditor): trigger ochrony uprawnień, handle_new_user='user', signup off.
3. Auth: login + `src/proxy.ts` (Next 16) + DAL. Tokeny BW + tryb jasny/ciemny.
4. Shell (sidebar+topbar), dashboard (pusty stan), narzędzie inspekcji testerów (`ui_feedback`), logo (kolor/biały wg motywu).
5. Konto Mikołaja (dev_admin+tester). Aplikacja DZIAŁA lokalnie (login→dashboard→inspekcja).
6. Przeglądy: code-reviewer + security-auditor + impeccable critique. Polskie znaki w copy. Patterny spisane w CLAUDE.md.

**Commity na branchu:** a4aeca5 (DB+auth) · 951dc16 (seed+proxy fix) · b7a10e5 (docs) · b917779 (inspekcja DB) ·
605ec60 (tokeny+hardening) · 79ca641 (UI Fazy 1) · 6773057 (polskie znaki+krytyka) · 2dfc965 (logo).

**Dokumentacja zaktualizowana (sesja 10 close):** CLAUDE.md (sekcja „Patterny i konwencje z budowy" — A–F),
STATUS.md (snapshot + „Jak wznowić na zimno"), CHANGELOG.md (0.3.0), INFRASTRUCTURE.md (auth/app),
DEV_LOG.md (ten wpis), decisions.md D-052, war-room reconciliacja (Master Excel porzucony).

**➡️ WZNOWIENIE: Faza 2a** — tworzenie klienta/projektu (auto-insert zadań wg typów) + dashboard z realnymi teczkami
(P1,P2,P13,P14). Trzymaj patterny z CLAUDE.md (deleguj UI subagentom, code-review po fragmencie, impeccable critique,
polskie znaki, commit per fragment). Rozważ PR brancha → main. ZMIEŃ tymczasowe hasło konta.

---

## [2026-06-15] polish | Polskie znaki w copy + krytyka impeccable (weryfikacja designu)

**Polskie znaki:** całe widoczne copy poprawione na diakrytyki (login, shell, dashboard, inspekcja) —
agenci pisali ASCII („Haslo"/„sie"). Zasada dopisana do `CLAUDE.md` + pamięci.

**Doprecyzowana zasada (CLAUDE.md):** impeccable = DWA kroki — kierunek PRZED budową + `critique`/`audit`
PRZED commitem (osobno od `code-reviewer`). Wcześniej robiłem tylko kierunek — luka.

**Krytyka impeccable (critique) — detektor czysty (0 anti-patternów), przegląd designu (ui-designer):**
- P0: dwa CTA „Dodaj klienta" na dashboardzie → usunięty nagłówkowy, jedno CTA w stanie pustym.
- P3: pusty stan szablonowy + zła treść (Ola nigdy nie zobaczy „brak projektów") → przepisany na „Pierwsze kroki"
  (teczka = grupa projektów; ręcznie lub Claude+MCP), bez generycznej ikony-dekoracji.
- P1: narzędzie inspekcji a11y → dodane: Escape wychodzi z trybu, auto-focus pola, `aria-pressed` na przełączniku,
  `role="dialog"`+`aria-label` na panelu, `aria-label` na anuluj, focus ring na textarea.
- P1 (odłożone do Fazy 2): tokeny statusów RAG bez wariantów dark — naprawię gdy pojawią się badge statusów.

**Logo:** Mikołaj podesłał logotyp BusinessWeb — czekam aż zapisze plik do `public/bw-logo.(svg|png)`, wtedy
wstawię w login + sidebar (zastąpi tekstowy „BW", co krytyka wytknęła). tsc/build OK.

---

## [2026-06-15] ui | Faza 1 UI: login + shell + narzędzie inspekcji (3 subagenci równolegle)

**Zbudowane przez 3 subagentów równolegle (rozdzielone pliki):**
- **Login** (nextjs-developer): `src/app/login/page.tsx` (Suspense+useActionState), `login/actions.ts` (signInWithPassword, walidacja redirectTo), `lib/actions/auth.ts` (logout).
- **Shell** (react-specialist): `src/app/(app)/layout.tsx` (requireUser + sidebar + topbar), `(app)/dashboard/page.tsx` (placeholder, pusty stan), `app/page.tsx` (→ /dashboard), `components/shell/*` (sidebar z aria-current, topbar z ThemeToggle + logout). Nav: Dashboard / Wszystkie projekty / Archiwum.
- **Inspekcja** (react-specialist): `components/inspection/inspection-tool.tsx` (pływający przycisk dla testerów, tryb klikania, capture-phase listener z cleanup, panel formularza), `build-selector.ts` (ścieżka CSS), `lib/actions/feedback.ts` (zapis do ui_feedback). Zamontowane w (app)/layout: `<InspectionTool isTester={user.isTester} />`.

**Integracja:** zamontowałem inspekcję w powłoce, naprawiłem build (login useSearchParams → owinięty w Suspense — wymóg Next 16). `next build` OK: trasy /, /login (static), /dashboard (dynamic), Proxy wykryty.

**Code review (code-reviewer) — naprawione od razu:**
- 🟡 `feedback.ts`: wyciek surowego błędu DB → generyczny komunikat + log serwerowy; dodana walidacja serwerowa (comment 1..2000, enum category/priority, limity długości, sanityzacja viewport/theme).
- 🟡 `login/actions.ts`: open-redirect przez backslash (`/\`) → odrzucane.
- 🟡 `build-selector.ts`: `CSS.escape` na id/atrybutach + fallback `body`.
- 🟢 (odłożone): a11y panelu inspekcji (Escape/role/aria-pressed), title topbara hardkodowany, ASCII vs polskie znaki — do polish.

**Status:** Faza 1 (auth + shell + inspekcja) złożona, zbudowana, przejrzana. Niezacommitowane → commit teraz. Następne: dashboard teczkowy z realnymi danymi (P13) / widok klienta (Faza 2).

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
