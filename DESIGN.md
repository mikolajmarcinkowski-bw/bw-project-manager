# Design System: BW Project Manager (narzędzie wewnętrzne)

> Adaptacja brandu BusinessWeb pod **gęste narzędzie analityczne** (NIE stronę marketingową).
> Kanon ekranów = `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/06-wireframes.html` (13 ekranów Hi-Fi, D-055).
> Tokeny zaimplementowane w `src/app/globals.css` (Tailwind v4 `@theme`, OKLCH). Pełny brand źródłowy: `WAR_ROOM/DESIGN.md`.
> Buduj WIERNIE z makiety danego ekranu — nie generycznie.

## Tryb i klimat
Jasny (domyślny, dzienna gęsta praca) + ciemny (kokpitowy, wieczorny przegląd) — toggle od MVP (`next-themes`, klasa `.dark`).
Klimat: **utylitarny editorial roboczy**, NIE kinowy. Zero hero, poster-nagłówków, duotone, ambient glow. Gęsto, spokojnie, premium.

## Kolory (tokeny w globals.css)
- **teal `#28B39B`** (`--teal`) = struktura, nagłówki sekcji, linki, aktywne stany, marker „tu jesteś", ikony/bordery. Na MAŁY tekst używaj `--teal-strong` (ciemniejszy, WCAG AA); w dark = równy `--teal`.
- **orange `#F94213`** (`--primary`) = **DOKŁADNIE JEDNA akcja podstawowa per widok** (CTA/submit). NIGDY status, nigdy dekoracja.
- **rev-green `#10E76D`** (`--rev-green`) = REV.BW / „working" / sukces (oszczędnie).
- **Statusy RAG (osobne od akcji):** on/done `#00E965` (`--status-on`), at-risk **amber `#EF9F27`** (`--status-at` — świadomie NIE orange), off-track/po terminie `#E24B4A` (`--status-off`, czerwony trójkąt Oli), QA `#378ADD` (`--status-quality`).
- **Typy wdrożeń (makieta):** CRM teal, SPO fiolet `#8257E6`, INT niebieski `#378ADD`, MKT róż `#EF7DAE`, ERP amber.
- **Kind zadań (makieta Gantt):** ws niebieski, own orange, config teal, test amber, ms/pm szary.
- Neutrale: tło/karty/pola tinted ku navy (light: białe/`#F3F4F6`/`#F5F8FA`; dark: `#171717`/`#1F1F1F`/`#242424`), tekst `#111B29`/`#F5F5F5`, border `#D1D5DB`/`#3A3A3A`. Nigdy czyste #000/#fff.

## Typografia
Montserrat (nagłówki/UI, 600, UMIARKOWANE rozmiary — H1 ~28–32px, NIE poster 64px), Lexend Deca (labelki/eyebrow/meta), Space Grotesk (ID/dane/mono). Eyebrow: uppercase, tracking .1em, teal.

## Komponenty
- **Przyciski:** pill (rounded-full ~50px). Primary = orange fill + biały label. Secondary = outline (teal/border). Hover crossfade ~0.3s; `active:` lekki press. Focus ring teal.
- **Karty:** radius 10px, cień whisper-soft (`shadow-whisper` = `0 8px 16px rgba(20,20,20,.04)`), flat default, lift na hover (`shadow-whisper-lg`).
- **Pola:** radius ~5–6px (kompaktowe jak HubSpot), focus → teal border + soft glow.
- **Badge statusów:** pill, kolor wg RAG, label Lexend Deca.
- **Nawigacja:** lewy sidebar (klient→projekt→widoki) + sticky topbar; aktywny element teal.
- **Gęstość:** tabele/listy kompaktowe (wiersz ~36–40px), Gantt tygodniowy, klocki jako karty.

## Słownik komponentów z makiet (06-wireframes.html — odwzorowuj 1:1)
- **Phase strip (ekran „Mapa klocków"):** poziomy pasek klocków `.pblock` (min-w ~90px, radius 9px) ze strzałkami `→` między nimi; klocek done = wyszarzony; aktywny `.pblock.now` = **teal 2px border + glow `0 0 0 3px teal-soft`** z pillem „TU JESTEŚ" (teal, biały, u góry). Diamenciki decyzji `.pdec` = **romb OBRYSOWANY fioletem SPO `#8257E6`** (28px, rotate-45), NIE wypełniony — stoją MIĘDZY klockami na ścieżce. Pod stripem `.parallel` = dwie kolumny obok siebie (Realizacja ∥ Kontrola), `.pcol` z teal-line borderem i teal-soft nagłówkiem.
- **Gantt (ekran „Harmonogram"):** **ciemny header `#222B28`**, kolumny: id / zadanie / kind / typ / est / own / tygodnie / status. Paski `.gbar` (rounded-full, h~12px) kolorowane **wg kind**. Wiersze faz `.grow.phase` wyróżnione; milestony `.grow.ms` = **żółte tło** (amber-soft). „Pokaż N ukrytych" dla N/A (P9).
- **Checklist fazy:** `.chk` wiersze z checkboxem (`.box.done` = zielony ✓), deadline-pill (d-ok/d-soon amber/d-over red), przycisk „Wycisz".
- **Romby:** milestone = wypełniony amber (`.dia-ms`); decyzja = obrysowany SPO (`.dia-dec`). To rozróżnienie jest istotne (diamencik ≠ milestone, D-039).

## Motion
Micro 0.2s ease-out (hover/stany), przyciski 0.3s crossfade, reveals 0.4s. Bez bounce/elastic. **Reduced-motion uszanowany** (globalny guard w globals.css; spinnery wyjęte).

## Do / Don't
- DO: jedna orange akcja/widok; teal = struktura; pill buttony; gęsto ale czytelnie; buduj z makiety ekranu.
- DON'T: kinowe hero / poster-nagłówki / duotone / ambient glow (to marketing, nie narzędzie); orange na statusy; identyczne kafelki; side-stripe borders; gradient-text; glassmorphism; czyste #000/#fff.
