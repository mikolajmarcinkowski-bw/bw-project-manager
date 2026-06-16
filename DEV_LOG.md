# DEV_LOG — Szczegółowy log pracy

> Format: `[YYYY-MM-DD] tag | tytuł`
> Tagi: `setup` · `feat` · `fix` · `deploy` · `db` · `mcp` · `blocker` · `checkpoint`

---

## [2026-06-16] feat | Faza 2c START — plasterek 1: interaktywne odhaczanie/status zadania (P7/P8) — commit `8aa767e`

- Branch `feat/faza-2c-zadania`. Pierwszy realny ZAPIS poza tworzeniem projektu.
- **`updateTaskStatus`** (server action): requireUser + RLS sesji usera (R13, NIE service_role),
  whitelist statusu, brak mass-assignment (serwer wylicza status+completion_date), completion_date przy
  „done" (P8), audyt activity_log actor_id z sesji (A4), revalidatePath.
- **TaskStatusControl** (Base UI Select jako klikalny pill, 5 statusów) wpięty w wiersz zadania Gantta;
  useTransition + router.refresh; a11y. Usunięty martwy TaskStatusPill.
- Przeglądy: code-reviewer (0 P0/P1) + security-auditor (BEZPIECZNE w modelu R1/R13, 0 high/krit).
- E2E: „Plan"→„Gotowe" persystuje po reload; zero błędów konsoli.
- **Ślad na V2 (z audytu, LOW):** integralność activity_log na poziomie DB (with check actor_id=auth.uid()),
  rate-limit server actions. Do utwardzenia później.
- **➡️ DALEJ w 2c:** owner+completion edycja (P8 pełne), ukrywanie N/A + „Pokaż N ukrytych" (P9),
  edycja dat z potwierdzeniem (P18), wyciszanie warningu (P19), ekran „Checklist fazy" (ekran 7).

---

## [2026-06-16] deploy | 🚀 Merge Faza 2b → main (produkcja) — merge `6dcd79e`

- **Merge `--no-ff`** `feat/faza-2b-gantt` → `main` (11 commitów). Push `29b3722..6dcd79e`. Auto-deploy Production (prod 200).
- **Na produkcji teraz:** widok projektu `/projects/[id]` = **Mapa klocków + phase strip** (główny) + **Harmonogram** (wierny task-level Gantt). Krok 0 (impeccable wpięty w design) + ekran 5 + ekran 6 + zwijanie + linia „dziś" + fix kamieni + QA Playwright (5 projektów) + krytyka impeccable/code-reviewer.
- **➡️ DALEJ: Faza 2c** — interaktywne zadania (odhaczanie/statusy P7, owner+completion P8, ukrywanie P9, edycja dat P18, wyciszanie P19). Pierwsze server actions WRITE poza tworzeniem (RLS R13, audyt A4) — security-sensitive.

---

## [2026-06-16] test+fix | Realne testy Playwright (5 projektów) + fix umiejscowienia kamieni

- **Spawnowano 4 zróżnicowane projekty testowe** (autoryzowane) w 2 nowych klientach (Comarch, Żabka) przez klon
  bogatego demo z wariacjami: inna aktywna faza, **brak daty startu** (tygodnie względne), **projekt po terminie**
  (czerwony trójkąt), **completed**. Cel: testy w wielu sytuacjach.
- **Szeroki QA Playwright** (dashboard + /projekty + 5 projektów × Mapa+Harmonogram, rozwijanie, odczyt DOM):
  **zero błędów konsoli, zero crashy.** Potwierdzone: multi-teczka + sortowanie zagrożonych (Żabka czerwona),
  marker „TU JESTEŚ" przenosi się per projekt (Integracja F1 vs Kaufland F3), null-date → względne T1..N (bez linii dziś),
  completed/atRisk OK.
- **🐛 BUG ZNALEZIONY I NAPRAWIONY (uwaga Mikołaja „kick-off poza etapami"):** kamień w tygodniu 1
  („Kick-off zakończony") lądował na końcu listy (po FAZIE 8), bo logika szukała fazy o `wEnd ≤ tydzień`.
  Fix: kamień → pierwsza faza ZAWIERAJĄCA tydzień (`wStart≤w≤wEnd`), inaczej ostatnia rozpoczęta, inaczej tail.
  Zweryfikowane: kick-off po FAZIE 0, architektura po FAZIE 2, go-live przy końcu.
- **Drobne (nie-bugi / limity):** stat „Po terminie" zahardkodowany 0 (brak due_date w data-layer → Faza 2c);
  interaktywność (odhaczanie/statusy) wciąż brak (Faza 2c); klony testowe mają pełny zestaw zadań niezależnie od typu (artefakt seeda).
- **Dane testowe na produkcji:** klienci Comarch/Żabka + 4 projekty (do usunięcia w razie potrzeby).
- Wcześniej w sesji: zwijalne fazy + ciągła linia „dziś" (feedback Mikołaja).

---

## [2026-06-16] feat | Krok 0 (impeccable w design) + ekran „Mapa klocków + phase strip" — commit `e850595`

- **Krok 0 (commit `9bec690`):** utworzono `PRODUCT.md` + `DESIGN.md` w repo build → impeccable wczytuje kontekst
  (`hasProduct/hasDesign=true`). DESIGN.md = wersja NARZĘDZIOWA (tokeny + słownik komponentów makiet), NIE marketingowy
  brand z war-roomu. To naprawia przyczynę „artefaktów AI".
- **Ekran 5 „Mapa klocków + phase strip"** (wiernie z `06-wireframes.html`): nowe `phase-strip.tsx`, `parallel-view.tsx`,
  `project-views.tsx` (taby Mapa | Harmonogram + wyłączone RACI/RAID/Budżet/KPI). Phase strip = ścieżka faz ze strzałkami,
  „TU JESTEŚ" (teal) na aktywnym, diamenciki decyzji (romb obrysowany, token `--spo`) NA ścieżce (D-039). Pod stripem
  Realizacja∥Kontrola (2 kolumny + podsumowania). Istniejący Gantt → zakładka „Harmonogram". Reużyto `getProjectDetail`.
- **Metoda (nowa dyscyplina):** subagent buduje z makiety → impeccable critique (TYM RAZEM z wczytanym DESIGN.md) +
  code-reviewer + detektor `[]` → poprawki → E2E jasny/ciemny → commit. Wdrożone uwagi: znak ‖ czytelny (dwa paski),
  pill statusu z `step.status` (nie zawsze „w toku"), pomijanie `na` w liczniku, rozróżnienie Sprint 1/2, role=tabpanel, token SPO.
- **Zweryfikowane:** tsc, prod build, E2E (zrzuty `/tmp/e2e/ps2-*`), zero błędów konsoli. Branch `feat/faza-2b-gantt` (niezmergowany).
- **➡️ DALEJ:** wierność ekranu „Harmonogram Gantt" (ciemny header, kind-bary) wg makiety; potem Faza 2c (interaktywne zadania).

---

## [2026-06-16] audit | 🔍 Holistyczny audyt luk + reconciliacja CAŁEJ dokumentacji

- **Powód (feedback Mikołaja):** „wszędzie artefakty AI" + „update całej dokumentacji i zweryfikuj pracę pod luki holistycznie".
  Przyczyna źródłowa: widok projektu budowany z modelu danych, nie z makiet `06-wireframes.html`; impeccable leciał bez
  wczytanego designu (`hasProduct:false`); dokumentacja w kilku miejscach opisywała Fazę 3 jak stan obecny.
- **Audyt (3 równoległe agenty Explore):** pokrycie ekranów/stories, backend/dane/infra, spójność dokumentów. Ustalenia:
  - Na produkcji **Faza 1 + 2a**; Gantt na branchu **niewierny makiecie**; brak ekranu „Mapa klocków + phase strip".
  - **~70% funkcji MVP brakuje** (interaktywność zapisu zadań, MCP/Claude 0/40, daily brief, archiwizacja, admin, dokumenty).
  - Server actions WRITE 1/26; 30 tabel w bazie, ~21 „martwych" (schema-only, pod Fazę 3).
- **Utworzono kanon statusu:** `WAR_ROOM/wiki/product/coverage-audit.md` (macierz stories/ekrany/backend × ✅🟡❌).
- **Naprawiono mylące dokumenty:** banner Faza-3 w `mcp-tools.md`; nota schema-only w `data-model.md` (+ „29"→„30 tabel");
  kolumna „Wdrożenie" w `product-backlog.md`; `CHANGELOG` [0.4.0] status; `CLAUDE.md` „Plan budowy" = prawdziwe fazy
  (2a✅/2b🟡/2c❌/3❌); `INFRASTRUCTURE.md` sekcja MCP + wiersze API/Resend = nie istnieje; `STATUS.md` blok „Prawdziwy
  status"; `index.md` (coverage-audit, D-055, Krok 7 done); **D-055** w `decisions.md` (kanon UI = makiety; impeccable z designem).
- **Bez zmian w kodzie aplikacji** — czysto dokumentacja/audyt.
- **➡️ Rekomendacja kolejności:** (1) przebudować widok projektu wg makiet (Mapa klocków + phase strip + wierny Gantt,
  impeccable z designem), (2) Faza 2c (interaktywne zadania), (3) Faza 3 (MCP, brief, admin, archiwum, dokumenty).

---

## [2026-06-16] feat | Faza 2b — widok projektu = Gantt + klocki + „tu jesteś" (branch `feat/faza-2b-gantt`) — commit `8f4a2db`

- **Co (P5/P6/P11/P12):** nowa trasa `/projects/[id]` — `ProjectHeader` + `GanttChart`.
  - Oś = **CSS grid, kolumna na tydzień** (`gridColumn: wStart+1 / wEnd+2`, koniec wykluczający). Realne daty
    gdy `start_date` sensowny (≥2000), inaczej tygodnie względne `T1..N`. Linia „dziś". **Auto-scroll do aktywnego
    kroku** przy montażu (mierzy realną szerokość kolumny). **Kolumna etykiet faz sticky-left** (przymrożona).
  - Klocki faz wg statusu (done/w toku/todo/pominięty), **„Tu jesteś"** = teal pierścień + pill na aktywnym kroku.
  - **Rozwijanie krok→zadania** (status/rodzaj/godziny/osoba), panel przypięty do lewej (czytelny przy scrollu osi).
  - **Kamienie** (romby wypełnione) + **decyzje P11** (romby obrysowane) + legenda; tagi ∥równolegle / cykliczny;
    decyzje bez kroku nie znikają.
- **Data layer:** `getProjectDetail` (cache, ~stała liczba zapytań); rozpiętość klocka z min/max tygodni zadań;
  weekCount≥8; fallback bounds przy niesymetrycznych tygodniach.
- **Realizacja:** data layer + trasa + integracja inline; komponenty Gantt + wszystkie poprawki przeglądów przez
  `react-specialist` (zlecenie Mikołaja: kodowanie przez subagentów). Wzór grid zweryfikowany ręcznie.
- **Przeglądy:** code-reviewer (0 P0, wzór grid potwierdzony) + impeccable critique (ui-designer) + detektor `[]`.
  Wdrożone: `cache()`, niesymetryczne tygodnie, logowanie 6 błędów, decyzje bez kroku, a11y rozwijania,
  off-by-one „dziś", **auto-scroll do aktywnego**, **sticky kolumna etykiet**, kontrast done w dark, czytelność zadań.
- **Włączone linki** wierszy projektów (`/projekty`, `/clients/[id]`) — usunięto `linkDisabled` (trasa istnieje).
- **⚠️ DANE DEMO (prod):** za zgodą Mikołaja zseedowano projekt testowy (był „gfdsg") → „Kaufland — Wdrożenie CRM
  (DEMO Gantt)": realny start 2026-04-06, aktywny krok F3, progres faz, para równoległa, 3 kamienie, 1 decyzja.
  To dane demonstracyjne na produkcyjnej bazie (jedna współdzielona).
- **Weryfikacja:** tsc + prod build OK; E2E nawigacja (klient→projekt) + render jasny/ciemny + rozwijanie +
  auto-scroll (zrzuty `/tmp/e2e/gantt-*`); zero błędów konsoli.
- **➡️ DALEJ:** Faza 2c (interaktywne zadania P7–P10 + edycja dat P18/drag) — patrz odpowiedzi dla Mikołaja.
  Branch 2b **niezmergowany** — do PR/mergu gdy zatwierdzony.

---

## [2026-06-16] deploy | 🚀 Merge Faza 2a → main (produkcja) — merge `81e9197`

- **Merge `--no-ff`** `feat/faza-2a-projekty` → `main` (13 commitów: ea4fab3…b13d291). Drzewo czyste, `main` był
  bezpośrednim przodkiem (brak konfliktów). Push `79be4d1..81e9197 main -> main`.
- **Auto-deploy Production** uruchomiony (Vercel↔GitHub, potwierdzony w INFRASTRUCTURE) — `bw-project-manager.vercel.app`.
- **Co trafiło na produkcję:** Faza 1 (auth+shell+inspekcja) + Faza 2a (klient/projekt+R15, dashboard teczkowy,
  /projekty, /clients/[id], /archiwum) + upiększenie + delight + obejście logowania dev (NIEAKTYWNE w prod —
  gate `NODE_ENV`, DEV_* nie w Vercel).
- **Bezpieczeństwo na produkcji:** leak zamknięty (hasło zrotowane, martwe); dev-login zweryfikowany jako nieobecny
  w prod buildzie; `.env.local`/`.env.e2e` gitignored (nie deployowane).
- **Dokumentacja:** pełna aktualizacja po mergu (ten wpis, CHANGELOG 0.6.0, STATUS, INFRASTRUCTURE, decisions D-053/D-054).

---

## [2026-06-16] ui | Więcej delightu — teczka otwiera się na hover + kaskady wejścia — commit `33625a6`

- **Sygnaturowy ruch (centrum):** `ClientCard` / `FolderGlyph` przebudowany — przednia klapka teczki uchyla
  się w 3D (`rotateX(-30deg)`, `origin-bottom`, perspective) na hover, odsłaniając 2 kartki (stała głębia,
  NIE liczność). Papier **adaptywny do motywu** (`dark:` warianty) — w ciemnym nie świeci jak artefakt.
- **Kaskadowe wejście (stagger):** kafelki teczek (dashboard) i wiersze projektów wjeżdżają fade-up z
  opóźnieniem per index. **`motion-safe:` + fail-safe** — baza = `opacity:1`, treść nie utyka na 0.
- **ThemeToggle:** animowany swap Sun/Moon (rotate+scale+opacity) + `active:scale-90`; polskie znaki w aria-label.
- **globals.css:** guard `prefers-reduced-motion` zerujący ruch, z wyjątkiem `.animate-spin` (spinner ładowania).
- **Kierunek:** impeccable (register=product → delight w konkretnych momentach, nie wszędzie); orange=1 akcja, teal=struktura.
  Subagenci: `react-specialist` (theme-toggle), centrum (folder 3D) inline — craft ruchu. Świadomie **odrzucony** puls
  trójkąta zagrożenia (ruch na ostrzeżeniu = źle — advisor) i toast sukcesu (brak infra).
- **Przeglądy:** code-reviewer + impeccable critique (ui-designer) + detektor `[]`. Wdrożone realne uwagi:
  spinner pod reduced-motion, `duration-400`→`500` (nie istnieje w v4), papier w dark, głębia kartek, redundantny lift.
- **Weryfikacja:** tsc czysty, prod build OK, E2E hover jasny+ciemny (zrzuty `/tmp/e2e/delight-*`), reduced-motion
  opacity karty = 1, zero błędów konsoli. (Uwaga: w logu dev hydration-warning od rozszerzenia Dashlane na /login —
  nie z naszego kodu.)

---

## [2026-06-16] security + feat | ✅ Rotacja hasła (leak domknięty) + obejście logowania dev

### ✅ ROTACJA HASŁA — leak domknięty po stronie produkcji
- **Zrobione:** zrotowane hasło konta `mikolaj.marcinkowski@businessweb.pl` przez Supabase Auth Admin API
  (service_role, skrypt jednorazowy `scripts/rotate-pass.mjs` — utworzony, wykonany, **usunięty**; nic w gicie).
  Hasło generowane losowo (crypto), zweryfikowane: nowe loguje, stare (z historii `21bf0a4`) martwe.
- **Creds E2E** zapisane do gitignored `.env.e2e` (E2E_EMAIL/E2E_PASS) — klik-testy znów działają bez creds w kodzie.
- **➡️ Po stronie Mikołaja:** oznaczyć alert GitHub jako „revoked". (Przepisanie historii niekonieczne — hasło już martwe.)

### feat | Obejście logowania dev (admin + user) — TYLKO lokalnie — commit `3ed0a2c`
- **Co:** na `/login` w trybie dev dwa przyciski („Wejdź jako Admin", „Wejdź jako User") — klik = wejście na konto
  dev bez wpisywania hasła. W produkcji/preview Vercela NIE istnieją (ani markup, ani działająca akcja).
- **Architektura (defense-in-depth, fail-closed):** `page.tsx` przepisany na server component, gate
  `NODE_ENV === 'development'` (render przycisków); akcja `devLogin(role)` w `actions.ts` twardo odmawia poza dev
  PRZED odczytem creds. Formularz wydzielony do `login-form.tsx`, przyciski w `dev-login.tsx`.
- **Konta dev (skrypt jednorazowy `scripts/seed-dev-accounts.mjs`, usunięty):** `dev-admin@bwmanager.pl` (admin+tester),
  `dev-user@bwmanager.pl` (user). Losowe hasła. **Creds WYŁĄCZNIE w `.env.local`** (gitignored, NIE w Vercel).
- **Weryfikacja:** prod build (`next build`+`next start`) — markup /login bez przycisków, grep `.next` bez creds;
  E2E klik admin+user → /dashboard, zero błędów konsoli; tsc czysty; impeccable detect `[]`.
- **Przeglądy:** code-reviewer (APPROVE, 0 P0/P1) + security-auditor (gate szczelny, 0 P0/P1). Wdrożone uwagi:
  gate fail-closed (`!== 'development'`), DEV_USER ograniczony do roli `user`, doprecyzowane komentarze.
- **⚠️ NAUCZKA (security-auditor):** `.env.local` zawiera teraz creds **produkcyjnego admina** (dev-admin) →
  jego wyciek = kompromitacja prod, nie tylko niedogodność dev. Traktować jak sekret klasy produkcyjnej.

---

## [2026-06-15] security + ui | 🔴 LEAK (do domknięcia) + upiększanie UI (foldery)

### 🔴 SECURITY — leak danych logowania (CZĘŚCIOWO domknięte, ROTACJA OTWARTA)
- **Co się stało:** GitHub secret scanning zgłosił „company email password". Zweryfikowane:
  zahardkodowałem email konta + hasło w `scripts/e2e.mjs` i zacommitowałem (**commit `21bf0a4`**). Mój błąd.
- **Zakres (sprawdzone w historii gita):** wyciekł TYLKO email+hasło konta `mikolaj.marcinkowski@businessweb.pl`.
  `.env.local` NIGDY nie był commitowany → klucze Supabase (service_role/anon) i Resend **bezpieczne**.
  `eyJ` w repo = tylko hash w `package-lock.json` (fałszywy alarm).
- **Naprawione:** `scripts/e2e.mjs` czyta teraz creds z env (E2E_EMAIL/E2E_PASS), nie z kodu (**commit `0a2f43d`**).
- **🔴 OTWARTE — DO ZROBIENIA NA START:** (1) **ROTACJA HASŁA** konta — stare wciąż działa i siedzi w historii `21bf0a4`
  (rotacja zablokowana przez bezpiecznik, bo nieautoryzowana — Mikołaj ma napisać „rotuj"). (2) W GitHubie oznaczyć alert „revoked".
  (3) Opcjonalnie: przepisanie historii (force-push) — po rotacji niekonieczne. (4) Po rotacji zaktualizować hasło tam, gdzie używane.
- **NAUCZKA (→ CLAUDE.md):** NIGDY nie hardkoduj danych logowania/sekretów w kodzie. E2E/skrypty czytają z env/gitignored.

### 🎨 Upiększanie UI (impeccable) — commit `b354cdb`
- **Teczki jak foldery:** `ClientCard` używa prawdziwego folderu — asset **Tabler Icons (MIT)** w `public/folder.svg`,
  inline tintowany teal (przez currentColor) — zamiast wcześniejszej CSS-zakładki (Mikołaj odrzucił). Folder „podnosi się" na hover.
- **Feeling klikania:** hover-lift kart + press (active) + płynne 0.2s ease-out + focus ring teal; project-row hover/press.
- **A11y kontrast teala:** token `--teal-strong` (ciemniejszy, ~WCAG AA) na MAŁY TEKST teal (nawigacja/breadcrumb/linki);
  `--teal` zostaje na ikonach/borderach/markerach. W trybie ciemnym `--teal-strong` = `--teal`.
- **Bogatszy pusty stan** dashboardu (brandowy, zapraszający, jedna orange akcja). Detektor anti-patternów: czysto. Build OK.
- Realizacja: kierunek + zasady z `impeccable`, implementacja przez subagenta `react-specialist`, folder-asset i ClientCard dopracowane przeze mnie.
- **NIEZWERYFIKOWANE WIZUALNIE przeze mnie** (bezpiecznik blokuje hasło w cmdline do E2E) — Mikołaj ogląda na `localhost:3000`; po rotacji podepnę creds E2E z gitignored pliku i zrobię zrzuty.

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
