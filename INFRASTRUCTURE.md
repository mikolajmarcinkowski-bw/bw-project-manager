# INFRASTRUCTURE — Stała dokumentacja infrastruktury

> Ten plik NIE jest aktualizowany po każdej sesji. Zmienia się tylko gdy zmieniają się serwisy/narzędzia.
> Jest punktem startowym gdy AI wchodzi w nowy kontekst i musi wiedzieć "jak tu działa infrastruktura".

---

## Aktualny stan (aktualizuj przy każdej zmianie)

> Ostatnia aktualizacja: 2026-06-30 · v3.7.0 · commit `af5a686`

| Serwis | Status | URL/ID | Ostatnia zmiana |
|--------|--------|--------|-----------------|
| GitHub repo | ✅ DZIAŁA | github.com/mikolajmarcinkowski-bw/bw-project-manager (private) | 2026-06-15 |
| Vercel projekt | ✅ DZIAŁA | bw-project-manager.vercel.app · auto-deploy na każdy push do `main` | 2026-06-15 |
| Supabase projekt | ✅ DZIAŁA | ipptnszwnjtoqpixhefd.supabase.co (West EU London, PG17) | 2026-06-15 |
| Schemat DB (migracje) | ✅ AKTUALNE | **10 migracji wdrożonych** — pełna lista poniżej | 2026-06-30 |
| Supabase CLI | ✅ ZALOGOWANE | Token w pamięci podręcznej CLI; `db push` działa bez hasła | 2026-06-29 |
| Supabase Storage | ✅ SKONFIGUROWANE | Bucket `project-documents` (private, 50MB, PDF/DOCX/XLSX/PNG/JPG) + 4 RLS policies | 2026-06-30 |
| Auth / konta | ✅ DZIAŁA | Rejestracja WYŁĄCZONA; Mikołaj: dev_admin+tester. Konta zakłada admin przez Auth Admin API | 2026-06-16 |
| Konta dev (lokalne) | ✅ DZIAŁA | `dev-admin`/`dev-user@bwmanager.pl` — creds tylko w `.env.local`, NIE w Vercel. Gate `NODE_ENV`. | 2026-06-16 |
| Aplikacja | ✅ NA PRODUKCJI | **v3.7.0** — pełna synchronizacja widoków + naprawy audytu PM. Commit `af5a686`. | 2026-06-30 |
| MCP Server | ✅ KOMPLETNY | **52/52 toolsów** (5 nowych w v3.6.0); `~/.claude/bw-mcp/server.mjs`; token Mikołaja: `ea127ca5-...` | 2026-06-30 |
| Daily brief (Resend) | 🟡 KOD OK, DNS BLOKUJE | Kod ✅; cron 04:30 UTC; `CRON_SECRET` w `.env.local`; DNS bwmanager.pl odłożony | 2026-06-17 |
| Resend | ✅ GOTOWE | brief@bwmanager.pl (1000 maili/mc free) | 2026-06-15 |
| Domena własna | ⏳ ODŁOŻONE | bwmanager.pl — po DNS skonfigurujemy Resend email | — |

### Migracje Supabase (chronologicznie)

| Plik | Data | Co robi |
|------|------|---------|
| `20260615120000_init_schema.sql` | 2026-06-15 | Schemat bazowy (29 tabel) |
| `20260615120100_rls_and_triggers.sql` | 2026-06-15 | RLS + triggery |
| `20260615120200_seed_templates.sql` | 2026-06-15 | Seed: 10 klocków faz + 3 cykliczne + 86 zadań |
| `20260615120300_inspection_feedback.sql` | 2026-06-15 | `profiles.is_tester` (A1) |
| `20260615120400_security_hardening.sql` | 2026-06-15 | Trigger ochrony ról |
| `20260618100000_task_pm_assignee.sql` | 2026-06-18 | `tasks.pm_assignee_id` (D-057) |
| `20260620000000_api_tokens.sql` | 2026-06-20 | MCP API tokens |
| `20260629000000_recurring_logic.sql` | 2026-06-29 | P12: `recurring_period`/`anchor_day`/`occurrence_index` + working_calendar święta 2025–2027 |
| `20260630000000_storage_rls.sql` | 2026-06-30 | D1: 4 RLS policies dla `storage.objects` (bucket project-documents) |
| `20260630100000_cr_impact_critical.sql` | 2026-06-30 | Audyt PM: dodaje 'critical' do enum `cr_impact` |

---

## Zakładanie kont (instrukcja krok-po-kroku)

### GitHub — nowe prywatne repo

AI wykonuje przez GitHub CLI (`gh`):
```bash
gh auth login          # autoryzacja (token z schowka od Mikołaja)
gh repo create bw-project-manager --private --description "BW Project Manager — wewnętrzne narzędzie Delivery"
# Repo: github.com/mikolajmarcinkowski-bw/bw-project-manager
```
Następnie: `git init`, `git remote add origin https://github.com/[USERNAME]/bw-project-manager.git`

### Supabase — nowy projekt

1. Mikołaj zakłada konto na supabase.com (lub podaje istniejące dane)
2. Mikołaj tworzy nowy projekt w panelu Supabase (wybiera region Europe West - Frankfurt)
3. Mikołaj podaje AI:
   - `SUPABASE_URL` (np. `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (do migracji i MCP)
4. AI: zapisuje do `.env.local`, konfiguruje klienta, uruchamia migracje

**CLI:** `npx supabase init`, `npx supabase db push`

### Vercel — nowy projekt

1. Mikołaj zakłada konto na vercel.com
2. AI: `npx vercel login` → Mikołaj autoryzuje w przeglądarce
3. AI: `npx vercel` — pierwsze linkowanie projektu
4. AI: ustawia zmienne środowiskowe przez `vercel env add`
5. Każdy push na `main` = auto-deploy na produkcję

**CI/CD:** GitHub → Vercel webhook (automatyczne po połączeniu). Preview deployments na każdym PR.

### Resend — email API

1. Mikołaj zakłada konto na resend.com (free tier: 1000 maili/mc)
2. Mikołaj tworzy API key w panelu
3. Mikołaj podaje AI: `RESEND_API_KEY`
4. AI: konfiguruje w `src/lib/email.ts`, ustawia cron na Vercel

---

## Zmienne środowiskowe

### Plik `.env.local` (lokalnie — NIGDY do gita)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (daily brief)
RESEND_API_KEY=
RESEND_FROM_EMAIL=brief@bwmanager.pl

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel environment variables (przez CLI lub dashboard)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production  # NIE NEXT_PUBLIC_!
vercel env add RESEND_API_KEY production
vercel env add NEXT_PUBLIC_APP_URL production         # https://bw-project-manager.vercel.app
```

**Ważne:** `SUPABASE_SERVICE_ROLE_KEY` i `RESEND_API_KEY` = tylko server-side (bez `NEXT_PUBLIC_` prefixu).

---

## Git workflow

### Branching

```
main          ← produkcja (chroniona, deploy auto przez Vercel)
dev           ← integracja (deploy preview przez Vercel)
feat/[nazwa]  ← nowa funkcja (np. feat/dashboard-teczki)
fix/[nazwa]   ← bugfix
```

### Codzienna praca

```bash
git checkout -b feat/[nazwa]
# ... praca ...
git add [pliki]
git commit -m "feat(scope): opis"
git push origin feat/[nazwa]
# PR do dev → merge → auto deploy na preview
# PR dev→main → deploy na produkcję
```

### Commit convention

```
feat(dashboard): dodaj dashboard teczkowy z czerwonym trójkątem
feat(gantt): implementuj widok Gantt z 9 fazami
feat(mcp): dodaj serwer MCP z operacją create_project
fix(auth): popraw middleware ochrony tras
fix(alerts): napraw żółty alert dla ≤2 dni
chore(db): dodaj migracje dla change_requests
chore(deps): aktualizuj zależności
```

---

## Supabase — workflow migracji (SPRAWDZONE 2026-06-15)

> ⚠️ **Sesja AI jest non-TTY.** Interaktywne komendy się NIE udają:
> - `npx supabase login` (flow przeglądarkowy) → `LegacyLoginMissingTokenError`
> - `supabase link` / `db push` próbujące zapytać o hasło DB → wieszają się / błąd
>
> Dlatego logujemy **tokenem**, a hasło DB podajemy **flagą**, nigdy przez prompt.

### 1. Logowanie CLI (jednorazowo) — przez Personal Access Token

```bash
# Mikołaj generuje token: https://supabase.com/dashboard/account/tokens → wrzuca do schowka
# AI odczytuje ze schowka i loguje (token zapisuje się w ~/.supabase, kolejne komendy go nie wymagają):
TOKEN="$(pbpaste | tr -d '[:space:]')"
npx supabase login --token "$TOKEN"

# Weryfikacja dostępu:
npx supabase projects list      # powinno pokazać ref: ipptnszwnjtoqpixhefd
```

### 2. Link projektu + deploy migracji (hasło DB przez flagę, nie prompt)

```bash
# Mikołaj wrzuca HASŁO DB do schowka. AI:
DBPASS="$(pbpaste)"
npx supabase link --project-ref ipptnszwnjtoqpixhefd --password "$DBPASS"

# Deploy migracji na produkcję (po zlinkowaniu):
npx supabase db push --password "$DBPASS"
# (alternatywnie hasło przez env: SUPABASE_DB_PASSWORD="$DBPASS" npx supabase db push)
```

### 3. Nowa migracja / typy

```bash
npx supabase migration new [nazwa]          # tworzy plik w supabase/migrations/[timestamp]_[nazwa].sql
npx supabase gen types typescript --project-id ipptnszwnjtoqpixhefd > src/types/supabase.ts
```

> 🚫 **Brak Dockera w tym środowisku** → `npx supabase db reset` i lokalny stack (`supabase start`)
> NIE działają. Pracujemy bezpośrednio na zdalnej bazie przez `db push`. SQL walidujemy
> manualnie + przez sam `db push` (PostgreSQL zgłosi błędy składni przy aplikacji migracji).

**Hasło DB:** ma Mikołaj (ustawione przy zakładaniu projektu). Podaje przez schowek na żądanie.
**Token CLI:** Personal Access Token z dashboardu — `~/.supabase`, nie commitować.

**Seed danych:** `supabase/migrations/*_seed_templates.sql` (osobna migracja DML) — szablony klocków
9-fazowych dla 5 typów (CRM/SPO/INT/MKT/ERP). Aplikuje się razem z `db push`.

---

## Vercel — deploy

```bash
# Preview (branch inny niż main)
git push origin feat/[cokolwiek]
# → Vercel auto buduje preview URL

# Produkcja (main)
git checkout main && git merge dev && git push
# → Vercel auto deploy na produkcję

# Ręczny deploy
npx vercel --prod

# Sprawdź status deployów
npx vercel ls
```

---

## MCP Server — architektura (🔴 FAZA 3 — NIE ISTNIEJE W MVP)

> ⚠️ **STATUS 2026-06-16: PLAN, niezaimplementowane.** Nie istnieje `src/app/api` — zero endpointów MCP/REST.
> Tworzenie projektu w MVP działa wyłącznie przez formularz (`createProjectAction`). Poniższe = docelowa
> architektura Fazy 3. Patrz `WAR_ROOM/wiki/product/coverage-audit.md`.

MCP server (Faza 3) będzie żył jako Next.js API routes: `/app/api/mcp/[tool]/route.ts`

```
POST /api/mcp/create_project
POST /api/mcp/get_projects
POST /api/mcp/update_task_status
... (pełna lista: WAR_ROOM/wiki/technical/mcp-tools.md)
```

**Auth:** Bearer token per-user (Supabase JWT). Każde wywołanie weryfikuje token i działa w imieniu PM-a.

**Użycie przez Claude:** PM w Claude (Cowork) wkleja umowę → Claude przez MCP tworzy projekt w aplikacji → PM dostaje link.

---

## Monitoring (TODO po MVP)

- Vercel Analytics (wbudowane, włączyć po deployie)
- Sentry — error tracking (opcjonalnie V2)
- Supabase Dashboard — metryki DB i auth

---

## Jak AI korzysta z infrastruktury

1. **Mikołaj poda klucz** → "klucz SUPABASE_URL jest w schowku" → AI dodaje do `.env.local`
2. **Migracje DB** → AI pisze SQL, Mikołaj uruchamia `npx supabase db push` LUB AI przez Bash jeśli ma dostęp
3. **Deploy** → AI robi `git push`, Vercel builduje automatycznie
4. **Zmienne na Vercel** → AI przez `vercel env add` (Mikołaj autoryzuje CLI raz)
5. **Wszystko co wymaga przeglądarki** (np. Supabase dashboard, Vercel panel) → Mikołaj robi raz, daje AI potrzebny output
