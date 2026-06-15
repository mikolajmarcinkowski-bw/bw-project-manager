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

# Logowanie (jednorazowo)
npx supabase login   # otworzy przeglądarkę

# Inicjalizacja w projekcie (jednorazowo)
npx supabase init

# Połącz z projektem (jednorazowo)
npx supabase link --project-ref ipptnszwnjtoqpixhefd

# Nowa migracja
npx supabase migration new [nazwa]
# Plik tworzy się w supabase/migrations/[timestamp]_[nazwa].sql

# Wdróż migracje na produkcję Supabase
npx supabase db push

# Generuj TypeScript types ze schematu DB
npx supabase gen types typescript --project-id ipptnszwnjtoqpixhefd > src/types/supabase.ts

# Reset lokalnej bazy (dev)
npx supabase db reset
```

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

Każdy artefakt frontendowy przechodzi przez `impeccable` zanim commit.
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

---

## Stack (nie do zmiany)

```
Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
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
Faza 1: Shell + Auth + routing (layout, sidebar, middleware, Supabase Auth)
Faza 2: Core UI — 3 równoległe subagenty (dashboard, Gantt+klocki, zadania+alerty)
Faza 3: MCP Server + email (Resend daily brief)
Faza 4: Admin panel + uzupełnienia P1
Faza 5: QA + testy + deploy finalny
```

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
