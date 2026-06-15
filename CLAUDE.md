@AGENTS.md

# BW Project Manager — Zasady pracy (Build)

> Ten plik to stała instrukcja dla każdej sesji AI. Czytaj na start każdej sesji.
> Nigdy nie kasuj ani nie skracaj bez wyraźnej zgody Mikołaja.

---

## Projekt

**BW Project Manager** — wewnętrzne narzędzie Delivery BusinessWeb do zarządzania ~30 projektami wdrożeniowymi. Tylko dla zespołu BW (Ola, Dominika). Klient nie ma dostępu.

**Operator:** Mikołaj Marcinkowski (mikolaj.marcinkowski@businessweb.pl) — kieruje projektem, podaje klucze, zatwierdza decyzje. AI wykonuje całą techniczną pracę.

**Repozytorium:** `github.com/mikolajmarcinkowski-bw/bw-project-manager` (private)
**URL produkcja:** https://bw-project-manager.vercel.app
**Supabase:** https://ipptnszwnjtoqpixhefd.supabase.co (West EU London)

---

## War-room — gdzie jest dokumentacja

```
WAR_ROOM = /Users/mikolajmarcinkowski/Library/CloudStorage/OneDrive-RevPointsp.o.o/Dokumenty/BW-ProjectManager/
```

**Pliki które CZYTASZ na start każdej sesji:**

| Plik | Co zawiera | Priorytet |
|------|-----------|-----------|
| `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/04-spec.md` | **GŁÓWNY PRD** — user stories, flows, reguły R1–R15, model danych | 🔴 KRYTYCZNY |
| `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/03-design-source.md` | Design system BW (kolory, fonty, komponenty) | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/data-model.md` | Schemat bazy danych, encje, pola, RLS | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/mcp-tools.md` | Lista operacji MCP (18 READ + 22 WRITE) | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/decisions.md` | Decyzje D-001…D-051 | 🟡 WAŻNY |
| `WAR_ROOM/STATUS.md` | Aktualny stan projektu | 🟡 WAŻNY |
| `WAR_ROOM/wiki/process/bw-process-matrix.md` | Matryca 6 faz BW (seed szablonów) | 🟡 WAŻNY |
| `DEV_LOG.md` | Historia pracy w tym folderze (ostatnie 3 wpisy) | 🟡 WAŻNY |
| `INFRASTRUCTURE.md` sekcja "Aktualny stan" | Co jest skonfigurowane | 🟡 WAŻNY |

Pełna mapa war-rooma → `WAR_ROOM_MAP.md`.

---

## Infrastruktura — jak korzystać z narzędzi

### GitHub

```bash
# Status
git status && git log --oneline -5

# Standardowy workflow
git add [pliki]
git commit -m "feat(scope): opis po polsku"
git push   # automatycznie używa zapisanego tokenu
```

**Token GitHub** jest skonfigurowany w `~/.git-credentials`. Jeśli push wymaga uwierzytelnienia:
- Mikołaj powie "token github jest w schowku"
- AI odczyta przez `pbpaste` i skonfiguruje przez `git remote set-url`

**Branches:**
- `main` → produkcja (auto-deploy Vercel gdy GitHub App skonfigurowane)
- `feat/[nazwa]`, `fix/[nazwa]` → dla nowych funkcji/bugfixów

### Vercel

```bash
# Deploy na produkcję
npx vercel --prod --yes

# Sprawdź status ostatnich deployów
npx vercel ls

# Dodaj zmienną środowiskową
printf "wartość" | npx vercel env add NAZWA_ZMIENNEJ production --yes
printf "wartość" | npx vercel env add NAZWA_ZMIENNEJ development --yes

# Pobierz zmienne z Vercel do .env.local
npx vercel env pull .env.local --yes

# Lista zmiennych
npx vercel env ls
```

**Ważne:** Każdy deploy przez `npx vercel --prod` buduje z aktualnych plików lokalnych.
Gdy GitHub App będzie skonfigurowane → każdy push na `main` = auto-deploy.

### Supabase CLI

```bash
# Instalacja (jednorazowo, bez sudo)
npm install supabase --save-dev

# Logowanie (jednorazowo) — UWAGA: sesja AI jest non-TTY, flow przeglądarkowy NIE działa.
# Logujemy się TOKENEM (Mikołaj generuje na https://supabase.com/dashboard/account/tokens → schowek):
TOKEN="$(pbpaste | tr -d '[:space:]')" && npx supabase login --token "$TOKEN"

# Inicjalizacja w projekcie (jednorazowo)
npx supabase init

# Połącz z projektem (jednorazowo) — hasło DB przez FLAGĘ (prompt nie działa w non-TTY)
DBPASS="$(pbpaste)" && npx supabase link --project-ref ipptnszwnjtoqpixhefd --password "$DBPASS"

# Nowa migracja
npx supabase migration new [nazwa]
# Plik tworzy się w supabase/migrations/[timestamp]_[nazwa].sql

# Wdróż migracje na produkcję Supabase (hasło DB przez flagę)
npx supabase db push --password "$DBPASS"

# Generuj TypeScript types ze schematu DB
npx supabase gen types typescript --project-id ipptnszwnjtoqpixhefd > src/types/supabase.ts

# UWAGA: brak Dockera → `npx supabase db reset` i lokalny stack NIE działają.
# Pracujemy bezpośrednio na zdalnej bazie przez `db push`.
```
Pełny, sprawdzony workflow (token + link + push) → `INFRASTRUCTURE.md` sekcja „Supabase — workflow migracji".

**Hasło do DB:** Mikołaj je zna (podał przy tworzeniu projektu). Jeśli potrzebne — pyta Mikołaja.

### Supabase klient — który kiedy

```typescript
// W Server Components i Server Actions:
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// W Client Components:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// W API routes i MCP server (operacje admin):
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()
// UWAGA: admin client ma service_role — nigdy nie używaj w client components!
```

### Resend (email)

```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL!,  // brief@bwmanager.pl
  to: 'ola@businessweb.pl',
  subject: 'Twój poranek — BW Manager',
  html: '<p>...</p>',
})
```

Instalacja: `npm install resend`

### Zmienne środowiskowe — workflow

1. **Mikołaj mówi**: "klucz [NAZWA] jest w schowku"
2. **AI wykonuje**:
   ```python
   # Python żeby uniknąć problemów ze spacją w ścieżce
   python3 -c "
   import subprocess, re
   key = subprocess.run(['pbpaste'], capture_output=True, text=True).stdout.strip()
   # ... aktualizuj .env.local
   "
   ```
3. **AI dodaje do Vercel**: `printf "%s" "$KEY" | npx vercel env add NAZWA env --yes`
4. `.env.local` nigdy do gita — sprawdź `.gitignore`

**Ważne:** `sed -i ''` ma problemy ze spacją w ścieżce folderu. Używaj Pythona do edycji `.env.local`.

---

## Model i subagenty

**Główny model sesji:** Claude Opus 4.8 — architekt, orchestrator, podejmuje decyzje.

**Delegacja do subagentów** (`~/.claude/agents/` — 154 agentów):

| Kiedy | Agent | Zadanie |
|-------|-------|---------|
| UI/komponenty React | `react-specialist` | Server/Client components, shadcn/ui, Tailwind |
| Nowa strona/routing | `nextjs-developer` | App Router, Server Actions, layouts |
| API routes, logika | `backend-developer` | Next.js API, Supabase queries, auth |
| MCP server | `mcp-developer` | Operacje z mcp-tools.md |
| Schemat DB, migracje | `database-optimizer` | Supabase SQL, RLS policies |
| TypeScript types | `typescript-pro` | Zod schemas, type safety |
| Testy | `test-automator` + `qa-expert` | Vitest, Playwright |
| Code review | `code-reviewer` | Security, jakość |
| Design sprawdzenie | skill `impeccable` | Zawsze przed commitem UI |

**Zasada:** niezależne zadania → agenci równolegle (jeden message, wiele Agent calls).

---

## Skill `impeccable` — TWARDA ZASADA

Każdy artefakt frontendowy przechodzi przez `impeccable` zanim commit. To są **DWA kroki**, oba obowiązkowe:
1. **Kierunek (przed budową):** wczytaj kontekst (`PRODUCT.md`/`DESIGN.md`), zasady designu i anti-patterny;
   przekaż tokeny + ograniczenia subagentom budującym UI.
2. **Weryfikacja (przed commitem):** odpal `impeccable critique` (krytyka UX/designu) — i wg potrzeby
   `audit` (a11y/perf/responsywność) / `polish` — na zbudowanym UI. Napraw realne uwagi. To NIE to samo co
   `code-reviewer` (ten sprawdza poprawność/bezpieczeństwo). Frontend = obie kontrole: impeccable + code-reviewer.

Każde nowe copy w UI = **poprawne polskie znaki** (ą/ć/ę/ł/ń/ó/ś/ź/ż), nigdy ASCII typu „Haslo"/„sie".

Design reference: `WAR_ROOM/product-specs/.../03-design-source.md` + `WAR_ROOM/PRODUCT.md`

---

## Zasady pracy (AI-first)

1. **Mikołaj kieruje, AI wykonuje.** Mikołaj podaje kierunek i zatwierdza. AI planuje, koduje, deployuje.

2. **Każda sesja zaczyna się od:**
   - Przeczytaj `DEV_LOG.md` (ostatnie 3 wpisy)
   - Przeczytaj `INFRASTRUCTURE.md` sekcja "Aktualny stan"
   - Przeczytaj odpowiednie fragmenty `04-spec.md` z war-rooma

3. **Po każdej znaczącej jednostce pracy:** aktualizuj `DEV_LOG.md`
4. **Po deployu:** aktualizuj `CHANGELOG.md`

5. **Git commit convention:**
   ```
   feat(dashboard): dodaj dashboard teczkowy z czerwonym trójkątem
   feat(gantt): implementuj widok Gantt 9-fazowy
   feat(mcp): dodaj serwer MCP z operacją create_project
   fix(auth): popraw middleware ochrony tras
   chore(db): migracja change_requests
   ```

6. **Nigdy nie pytaj o decyzje techniczne** — masz spec, podejmij decyzję i zakomunikuj.

7. **Przegląd przez subagentów — OBOWIĄZKOWY (zlecenie Mikołaja 2026-06-15):**
   - **Po każdym większym fragmencie pracy** (feature, widok, migracja, większy moduł) → zleć agentowi
     `code-reviewer` przegląd diffa. Napraw realne uwagi przed dalszą budową.
   - **Co jakiś czas** (po kilku fragmentach / przed mergem dużej fazy / przy zmianach wrażliwych:
     auth, RLS, API, sekrety) → zleć `security-auditor` audyt bezpieczeństwa.
   - Przeglądom dawaj kontekst realiów stacku (Next 16: `proxy.ts` nie `middleware`, async `cookies()`),
     żeby nie zgłaszały fałszywych alarmów. Weryfikuj wynik — summary agenta to intencje, nie zawsze fakty.

---

## Stack (nie do zmiany)

```
Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui   (UWAGA: 16, nie 14 — proxy.ts zamiast middleware, async cookies())
Supabase (PostgreSQL + Auth + Storage + RLS)
Vercel (hosting + CI/CD)
Resend (email — daily brief)
Next.js API routes /api/mcp/* (edycyjny serwer MCP)
```

**Kluczowa zasada (D-016):** Zero Anthropic API w Next.js. AI żyje wyłącznie w Claude.

---

## Reguły krytyczne z 04-spec.md

- **R1:** Aplikacja wyłącznie wewnętrzna (brak kont klientów)
- **R3:** Realizacja ∥ Kontrola = równolegle, nie sekwencja
- **R11:** Zero AI w kodzie aplikacji
- **R13:** Każdy PM widzi WSZYSTKIE projekty — nie ograniczaj RLS per-PM
- **R15:** Auto-insert zadań wg union typów CRM/SPO/INT/MKT/ERP

Pełne reguły R1–R15: `WAR_ROOM/product-specs/.../04-spec.md` sekcja 4.

---

## Plan budowy (5 faz z 07-initial-prompt.md)

```
Faza 0: ✅ UKOŃCZONA — Next.js init, Supabase, Vercel, Resend, GitHub
        + ✅ schemat DB (29 tabel + RLS) WDROŻONY + seed (13 szablonów / 86 zadań, D-052)
Faza 1: 🔶 W TOKU — plumbing auth gotowy (src/proxy.ts [NIE middleware — Next 16!], update-session, DAL);
        ZOSTAJE: brandowy UI (tokeny BW + theme toggle + shell sidebar/topbar + login) przez `impeccable`
Faza 2: Core UI — 3 równoległe subagenty (dashboard, Gantt+klocki, zadania+alerty)
Faza 3: MCP Server + email (Resend daily brief)
Faza 4: Admin panel + uzupełnienia P1
Faza 5: QA + testy + deploy finalny
```
> ⚠️ Next 16: `middleware.ts` → `proxy.ts` (w `src/`), `cookies()` async. Czytaj `node_modules/next/dist/docs/` przed kodem Next.

Szczegółowy plan: `WAR_ROOM/product-specs/.../07-initial-prompt.md`

---

## Changelog update — kiedy

| Zdarzenie | DEV_LOG.md | CHANGELOG.md |
|-----------|-----------|-------------|
| Ukończony komponent/feature | ✅ | — |
| Commit + push | ✅ | — |
| Deploy na Vercel | ✅ | ✅ |
| Ukończona faza | ✅ | ✅ |
| Bloker/błąd | ✅ | — |

---

## Patterny i konwencje z budowy (USTALONE — stosuj w każdej sesji)

Wypracowane podczas budowy fundamentu + Fazy 1 (2026-06-15). To są twarde reguły „jak tu pracujemy".

### A. Stack — realia Next 16.2.9 (NIE Twój trening!)
- `AGENTS.md`: przed pisaniem kodu Next czytaj `node_modules/next/dist/docs/01-app/...`.
- **`proxy.ts` (w `src/`) zastępuje `middleware.ts`** — default/named export `proxy`, runtime Node.js. Plik MUSI być na poziomie `app/` (czyli `src/proxy.ts`, NIE w roocie — w roocie jest cicho ignorowany).
- **`cookies()` jest async** (`await cookies()`). Server Actions: `'use server'`.
- **Tailwind v4 CSS-first**: tokeny w `src/app/globals.css` (`@theme inline`, `@custom-variant dark`, `oklch()`). BRAK `tailwind.config.js`.
- `useSearchParams()` w komponencie wymaga otoczki `<Suspense>` (inaczej build się wywala).
- ⚠️ **Stale-cache dev:** HMR tokenów Tailwind v4 (`@theme`) bywa zawodny po wielu edycjach/przełączeniach brancha —
  kolory renderują się źle (np. `--primary` jako czerń zamiast orange) mimo poprawnego CSS. Fix: `pkill -f "next dev"`,
  `rm -rf .next/dev .next/cache`, restart. **Gdy kolory wyglądają źle w dev — najpierw restart, dopiero potem szukaj bugu.**

### B. Supabase (sesja AI = non-TTY)
- Login CLI: `npx supabase login --token "$TOKEN"` (token z dashboardu, NIE flow przeglądarkowy — nie działa).
- Link/push: hasło DB przez flagę `--password "$DBPASS"` (prompt nie działa). Brak Dockera → praca na zdalnej bazie, `db reset`/lokalny stack niedostępne. Pełny workflow → `INFRASTRUCTURE.md`.
- Klienci: `@/lib/supabase/server` (await createClient, server comp/actions), `client` (komponenty klienckie), `admin` (service_role — TYLKO server/API/MCP, nigdy w client).
- Po migracji: `gen types` → `src/types/supabase.ts`. **Weryfikuj wdrożoną rzeczywistość** sondami REST (count/select), nie tylko plikiem migracji.
- **Deploy migracji wrażliwych (auth/RLS) = za zgodą Mikołaja** (classifier blokuje auto-deploy — słusznie).

### C. Model danych / bezpieczeństwo
- Kanon schematu = **migracje + `src/types/supabase.ts`**, nie opisy w `data-model.md` (ten bywa nieaktualny). Reconcyliacja: PRD §6 + rewizje D-051 > stare ciało doku. Test akceptacyjny: każdy parametr toola z `mcp-tools.md` ma kolumnę.
- RLS: **R13 — każdy zalogowany = pełny dostęp do danych projektów** (`using(true)`). Szablony/pula/kalendarz: read-all + write-admin. NIE ograniczaj per-PM.
- Funkcje RLS (`is_admin`, `is_tester`, `current_user_role`): `SECURITY DEFINER` + `set search_path = public` (zawsze!).
- **Ochrona uprawnień**: trigger `protect_profile_privileges` blokuje zmianę `role`/`is_tester` dla nie-adminów (`auth.uid() IS NULL` = kontekst zaufany: service_role/migracja/MCP — wtedy dozwolone). `handle_new_user` zaszywa rolę `'user'` (nie ufa metadanym). Rejestracja wyłączona (prod: dashboard Supabase).
- **Konta zakłada admin** przez Auth Admin API (`POST /auth/v1/admin/users` service_role) + `PATCH /rest/v1/profiles` na rolę. (Mikołaj = dev_admin + tester; hasło tymczasowe do zmiany.)

### D. Delegacja do subagentów (TWARDA — zlecenie Mikołaja)
- **Fundament / praca wymagająca osądu i spójności** (schemat DB, reconcyliacja docs) → inline (subagent zgubiłby kontekst, przeczytałby stare źródła).
- **UI / rzeczy równoległe** → DELEGUJ (`react-specialist`, `nextjs-developer`), równolegle, z: (1) twardymi realiami Next 16, (2) nazwami tokenów BW, (3) wzorcami Supabase, (4) **rozdzielonymi plikami** (ownership boundary) by nie było konfliktów, (5) zakazem `next build` gdy drzewo się zmienia. Po powrocie: integruję + `next build` + naprawiam.
- **Po każdym większym fragmencie → `code-reviewer`** (pkt 7). **Okresowo / przy auth-RLS-API → `security-auditor`.** Naprawiaj realne uwagi PRZED dalszą budową.

### E. Frontend = impeccable (DWA kroki, D-050)
1. **Kierunek (przed budową):** wczytaj `PRODUCT.md`/`DESIGN.md` + zasady; przekaż tokeny/anti-patterny agentom.
2. **Weryfikacja (przed commitem):** `impeccable critique` (+ `audit`/`polish` wg potrzeby) na zbudowanym UI. To NIE to samo co `code-reviewer`. Detektor: `npx impeccable detect --json <pliki>`.
- **Copy = polskie znaki** (ą/ć/ę/ł/ń/ó/ś/ź/ż), nigdy ASCII. Subagenci domyślnie piszą ASCII — pilnuj sweepem.
- Kolory: orange `#F94213` = JEDNA akcja per widok; teal `#28B39B` = struktura/aktywne; statusy RAG osobno. Tokeny w globals.css. Przyciski pill. Anti-patterny: zero hero/SaaS-cream/hero-metric/identycznych kafelków/side-stripe/gradient-text/glassmorphism/modal-first.
- Logo: `Logo` (`src/components/brand/logo.tsx`) — kolorowy (`bw-logo.png`) w jasnym, biały (`bw-logo-white.png`) w ciemnym, przełączane CSS `dark:`.
- **Klik-testy E2E:** `node scripts/e2e.mjs` (Playwright headless na localhost:3000) — realne logowanie + flow + zrzuty do `/tmp/e2e` + zbieranie błędów konsoli. Uruchamiaj po większych zmianach UI; oglądaj zrzuty (Read) by ocenić wygląd na żywo, nie tylko z kodu.

### F. Git / logowanie
- Branch roboczy `feat/...` (NIE bezpośrednio na main). Commit per fragment, po polsku, z trailerem `Co-Authored-By: Claude Opus 4.8 (1M context)`. Push po commicie.
- Loguj na bieżąco: `DEV_LOG.md` (kronika), `STATUS.md` (snapshot), `CHANGELOG.md` (deploy/faza). War-room (`STATUS.md`, `wiki/`, `product-specs/`) jest POZA repo gita — zmiany trwałe przez OneDrive.
- Każda decyzja produktowa/architektoniczna → `WAR_ROOM/wiki/technical/decisions.md` (kolejne D-0xx). Po zmianie utrzymuj spójność cross-refów (twarda zasada).
- 🔴 **NIGDY nie hardkoduj danych logowania/sekretów w kodzie** (nauczka 2026-06-15: zahardkodowane hasło konta w
  `scripts/e2e.mjs` → leak wykryty przez GitHub secret scanning). Creds/sekrety zawsze z env lub gitignored `.env*`.
  Nie podawaj też hasła w linii poleceń (ląduje w historii shella) — użyj pliku env. Po wykryciu leaku: rotuj sekret + oznacz alert „revoked".
