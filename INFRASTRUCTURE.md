# INFRASTRUCTURE — Stała dokumentacja infrastruktury

> Ten plik NIE jest aktualizowany po każdej sesji. Zmienia się tylko gdy zmieniają się serwisy/narzędzia.
> Jest punktem startowym gdy AI wchodzi w nowy kontekst i musi wiedzieć "jak tu działa infrastruktura".

---

## Aktualny stan (aktualizuj przy każdej zmianie)

| Serwis | Status | URL/ID | Ostatnia zmiana |
|--------|--------|--------|-----------------|
| GitHub repo | ✅ GOTOWE | github.com/mikolajmarcinkowski-bw/bw-project-manager | 2026-06-15 |
| Vercel projekt | ✅ GOTOWE | bw-project-manager.vercel.app (team: mikolaj-marcinkowski-s-projects) | 2026-06-15 |
| Vercel→GitHub sync | ⚠️ BRAK — do ustawienia | Trzeba zainstalować GitHub App przez Vercel dashboard | — |
| Supabase projekt | ⏳ DO ZAŁOŻENIA | — | — |
| Resend konto | ⏳ DO ZAŁOŻENIA | — | — |
| Domena własna | ⏳ TBD | — | — |

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

## Supabase — workflow migracji

```bash
# Nowa migracja
npx supabase migration new [nazwa_migracji]
# Edytuj plik w supabase/migrations/

# Zastosuj lokalnie (dev)
npx supabase db reset

# Deploy na produkcję
npx supabase db push --project-ref [REF_ID]

# Generuj typy TypeScript
npx supabase gen types typescript --project-id [REF_ID] > src/types/supabase.ts
```

**Seed danych:** `supabase/seed.sql` — szablony klocków 9-fazowych dla 5 typów (CRM/SPO/INT/MKT/ERP). Uruchamia się przy `db reset`.

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

## MCP Server — architektura

MCP server żyje jako Next.js API routes: `/app/api/mcp/[tool]/route.ts`

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
