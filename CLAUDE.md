@AGENTS.md

# BW Project Manager — Zasady pracy (Build)

> Ten plik to stała instrukcja dla każdej sesji AI. Czytaj na start każdej sesji.
> Nigdy nie kasuj ani nie skracaj bez wyraźnej zgody Mikołaja.

---

## Projekt

**BW Project Manager** — wewnętrzne narzędzie Delivery BusinessWeb do zarządzania ~30 projektami wdrożeniowymi. Tylko dla zespołu BW (Ola, Dominika). Klient nie ma dostępu.

**Operator:** Mikołaj Marcinkowski (mikolaj.marcinkowski@businessweb.pl) — kieruje projektem, podaje klucze, zatwierdza decyzje. AI wykonuje całą techniczną pracę.

**Repozytorium:** `github.com/mikolajmarcinkowski-bw/bw-project-manager` (private)
**URL produkcja:** bw-project-manager.vercel.app (lub domena własna — TBD)

---

## War-room — gdzie jest dokumentacja

Cały kontekst produktowy i specyfikacja żyją poza tym folderem, w war-roomie:

```
WAR_ROOM = /Users/mikolajmarcinkowski/Library/CloudStorage/OneDrive-RevPointsp.o.o/Dokumenty/BW-ProjectManager/
```

**Pliki które CZYTASZ na start każdej sesji (lub gdy potrzebujesz kontekstu):**

| Plik | Co zawiera | Priorytet |
|------|-----------|-----------|
| `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/04-spec.md` | **GŁÓWNY PRD** — user stories, flows, reguły, model danych | 🔴 KRYTYCZNY |
| `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/03-design-source.md` | Design system BW (kolory, fonty, komponenty) | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/data-model.md` | Schemat bazy danych, encje, RLS | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/mcp-tools.md` | Lista operacji MCP (READ + WRITE) | 🔴 KRYTYCZNY |
| `WAR_ROOM/wiki/technical/decisions.md` | Log decyzji D-001…D-051 | 🟡 WAŻNY |
| `WAR_ROOM/wiki/technical/stack.md` | Stack + architektura | 🟡 WAŻNY |
| `WAR_ROOM/STATUS.md` | Stan projektu (snapshot) | 🟡 WAŻNY |
| `WAR_ROOM/wiki/process/bw-process-matrix.md` | Matryca 6 faz BW (seed szablonów) | 🟡 WAŻNY |
| `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/07-initial-prompt.md` | Plan budowy z delegacją subagentów | 🟢 REFERENCJA |

Pełna mapa war-rooma → `WAR_ROOM_MAP.md` (w tym folderze).

---

## Model i subagenty

**Główny model sesji:** Claude Opus 4.8 — architekt, orchestrator, podejmuje decyzje.

**Delegacja do subagentów** (globalnie w `~/.claude/agents/`):

| Kiedy | Agent | Zadanie |
|-------|-------|---------|
| Budowa UI/komponenty React | `react-specialist` | Server/Client components, shadcn/ui, Tailwind |
| Cały ekran / nowa strona | `nextjs-developer` | App Router, Server Actions, routing |
| API routes, logika serwera | `backend-developer` | Next.js API, Supabase queries, autoryzacja |
| MCP server | `mcp-developer` | Operacje z mcp-tools.md |
| Schemat DB, migracje, RLS | `database-optimizer` lub `postgres-pro` | Supabase SQL, polityki RLS |
| TypeScript types, generics | `typescript-pro` | Type safety, Zod schemas |
| Testy | `test-automator` + `qa-expert` | Vitest, Playwright |
| Code review | `code-reviewer` | Bezpieczeństwo, jakość, performance |
| Dowolny UI/frontend | ZAWSZE przez `impeccable` skill | Design check przed commitem |

**Zasada równoległości:** niezależne zadania → uruchamiaj agentów równolegle.
**Zasada weryfikacji:** po pracy subagenta — sprawdź kluczowe pliki.

---

## Skill `impeccable` — TWARDA ZASADA

**Każdy artefakt frontendowy MUSI przejść przez skill `impeccable` zanim commit.**

Skill: `~/.claude/skills/impeccable/`
Design reference: `WAR_ROOM/product-specs/.../03-design-source.md` + `WAR_ROOM/PRODUCT.md`

---

## Zasady pracy (AI-first)

1. **Mikołaj kieruje, AI wykonuje.** Mikołaj podaje kierunek i zatwierdza. AI planuje, koduje, deployuje, konfiguruje.

2. **Klucze API — workflow:**
   - Mikołaj mówi: "klucz [nazwa] jest w schowku"
   - AI zapisuje do `.env.local` i implementuje w kodzie
   - `.env.local` NIGDY do gita (jest w `.gitignore`)

3. **Każda sesja zaczyna się od:**
   - Przeczytaj `DEV_LOG.md` (ostatnie 3 wpisy)
   - Przeczytaj `INFRASTRUCTURE.md` sekcja "Aktualny stan"

4. **Po każdej znaczącej jednostce pracy:**
   - Aktualizuj `DEV_LOG.md`
   - Aktualizuj `CHANGELOG.md` przy deployu lub ukończonej funkcji

5. **Git commit convention:**
   ```
   feat(scope): opis po polsku
   fix(scope): opis
   chore(scope): opis
   ```

6. **Nigdy nie pytaj Mikołaja o decyzje techniczne** — masz spec, podejmij decyzję i zakomunikuj.

---

## Stack (nie do zmiany)

```
Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
Supabase (PostgreSQL + Auth + Storage + RLS)
Vercel (hosting + CI/CD)
Resend (email — daily brief)
Next.js API routes /api/mcp/* (edycyjny serwer MCP)
```

**Kluczowa zasada (D-016):** Zero Anthropic API w kodzie Next.js. AI żyje wyłącznie w Claude po stronie Mikołaja.

---

## Reguły krytyczne z 04-spec.md

- **R1:** Aplikacja wyłącznie wewnętrzna — brak kont klientów/specjalistów
- **R3:** Realizacja ∥ Kontrola = równolegle, nie sekwencja
- **R11:** Zero AI w kodzie aplikacji
- **R13:** Każdy PM widzi WSZYSTKIE projekty — nie ograniczaj RLS per-PM
- **R15:** Auto-insert zadań wg union typów CRM/SPO/INT/MKT/ERP

---

## Changelog update — kiedy

| Zdarzenie | DEV_LOG.md | CHANGELOG.md |
|-----------|-----------|-------------|
| Ukończony komponent/feature | ✅ | — |
| Commit + push | ✅ | — |
| Deploy na Vercel | ✅ | ✅ |
| Ukończona faza budowy | ✅ | ✅ |
| Bloker lub błąd | ✅ | — |
