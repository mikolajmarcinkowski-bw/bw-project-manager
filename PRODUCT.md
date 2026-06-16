# Product: BW Project Manager

register: product

> Kontekst dla skilla `impeccable` (i każdego budowania UI). Kanon WYGLĄDU ekranów = `DESIGN.md` (obok) +
> makiety Hi-Fi `WAR_ROOM/product-specs/2026-06-03-bw-project-manager/06-wireframes.html` (D-055). Buduj WIERNIE z makiet.

## Product Purpose
Wewnętrzne narzędzie („War Room") zespołu Delivery BusinessWeb do prowadzenia ~30 projektów wdrożeniowych HubSpot/integracyjnych jednocześnie. Kontrolna wieża: wejście w klienta → projekt → harmonogram Gantta z klockami faz i markerem „tu jesteś" → zadania z odpowiedzialnym i datą. Setup projektu przez rozmowę z Claude (MCP, Faza 3). Poranny brief mailem. Zastępuje prowadzenie projektów na mailu, Dysku Google i w arkuszach.

## Users
- **Ola — Head of Delivery + Product Owner.** Prowadzi większość projektów. Chce narzędzia wizualnego, prostego, analitycznego („lewa, zadaniowa strona mózgu"). Skanuje portfel rano; potrzebuje natychmiast widzieć co pilne i co zagrożone. Jakość > pośpiech.
- **Dominika — PM.** Drugi główny user, podobne potrzeby.
- Skala: ~30 aktywnych projektów, 2–3 userów równocześnie. Aplikacja wyłącznie wewnętrzna (brak klienta/specjalisty).

## Brand & Tone
Tożsamość BusinessWeb, ale w skórze **gęstego narzędzia, nie marketingowej strony**. Ton: rzeczowy, kompetentny, spokojny. Montserrat (nagłówki/UI), Lexend Deca (labelki/meta), Space Grotesk (ID/dane). Teal #28B39B = struktura/trust/„tu jesteś"; orange #F94213 = wyłącznie jedna akcja per widok; neon green = REV.BW/sukces. Statusy RAG (green/amber/red/blue) oddzielone od action orange.

## Anti-references
- NIE marketingowy layout: **żadnego kinowego hero, monumentalnych poster-nagłówków, ilustracji duotone, ambient glow**. To narzędzie do pracy, nie landing. (Uwaga: kanoniczny brand `WAR_ROOM/DESIGN.md` opisuje stronę marketingową — NIE przenoś jej hero/efektów do aplikacji.)
- NIE generyczny SaaS-cream dashboard z hero-metric template i identycznymi kafelkami.
- NIE schematyczne, ubogie graficznie szkielety — ma być premium, dopracowane, ale gęste.
- NIE Notion/Jira-clone. Gęstość informacji + spokój wizualny jednocześnie.

## Strategic Principles
- „Good Enough" first: minimalne, używalne narzędzie wyciągające z zalania mailem/Dyskiem.
- Gęstość bez chaosu: ~30 projektów na ekranie, ale czytelnie; jeden sygnał zagrożenia (czerwony trójkąt) rzuca się w oczy.
- Jedna akcja podstawowa per widok (orange). Statusy nie konkurują z akcją.
- Tryb jasny (dzień, gęsta praca) + ciemny (wieczorny przegląd) — toggle od MVP.
- AI żyje w Claude, nie w aplikacji.

## Register note
Product (design SERVES the tool). Restrained-committed: tinted neutrals + teal structural accent + orange jako jedyna akcja + RAG status. Dense data surfaces (Gantt, listy, klocki, phase strip).
