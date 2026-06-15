-- =====================================================================
-- SEED: step_templates + step_task_templates
-- WYGENEROWANE ze skryptu scripts/gen-seed.mjs ze źródła raw/00_harmonogram.html (R14).
-- KANON: struktura 9-fazowa (FAZA 0-8 + Sprint 2) jest FINALNA — "Master Excel" Oli
--   PORZUCONY (D-052). Nadpisuje notatkę matrycy "baza = 6 faz" (bw-process-matrix.md).
--   Mapowanie typów (CRM/SPO/INT/MKT/ERP -> zadania) pochodzi z pól type/note harmonogramu.
-- KONWENCJA R15 (auto-insert): applies_to_types = '{}' oznacza WSZYSTKIE typy.
--   Zapytanie auto-insertu MUSI: cardinality(applies_to_types)=0 OR applies_to_types && :selected
--   (sam operator && na pustej tablicy = false -> bez special-case "puste" znaczyłoby ŻADNE).
-- =====================================================================

insert into step_templates (phase_number, phase_name, step_order, step_title, applies_to_types, is_recurring, is_parallel) values
  (0, 'Inicjacja i Kick-off', 1, 'FAZA 0 — Inicjacja i Kick-off', '{}', false, false),
  (1, 'Discovery i Audyt Obecnego Stanu', 1, 'FAZA 1 — Discovery i Audyt Obecnego Stanu', '{}', false, false),
  (2, 'Projektowanie i Architektura', 1, 'FAZA 2 — Projektowanie i Architektura', '{}', false, false),
  (3, 'Konfiguracja i Implementacja (Sprint 1)', 1, 'FAZA 3 — Konfiguracja i Implementacja (Sprint 1)', '{}', false, false),
  (3, 'Konfiguracja i Implementacja (Sprint 2)', 2, 'FAZA 3 — Konfiguracja i Implementacja (Sprint 2)', '{}', false, false),
  (4, 'Migracja i Czyszczenie Danych', 1, 'FAZA 4 — Migracja i Czyszczenie Danych', '{}', false, false),
  (5, 'Testy i Odbiór (SIT / UAT)', 1, 'FAZA 5 — Testy i Odbiór (SIT / UAT)', '{}', false, false),
  (6, 'Szkolenia i Zarządzanie Zmianą', 1, 'FAZA 6 — Szkolenia i Zarządzanie Zmianą', '{}', false, false),
  (7, 'Go-live i Hypercare', 1, 'FAZA 7 — Go-live i Hypercare', '{}', false, false),
  (8, 'Zamknięcie Projektu', 1, 'FAZA 8 — Zamknięcie Projektu', '{}', false, false),
  (99, 'Klocki cykliczne', 1, 'Raport statusu tygodniowy (mail co czwartek)', '{}', true, false),
  (99, 'Klocki cykliczne', 2, 'Piątkowe podsumowanie finansowe/godzinowe', '{}', true, false),
  (99, 'Klocki cykliczne', 3, 'Spotkanie przyrostowe z klientem', '{}', true, false);

-- FAZA 0 — Inicjacja i Kick-off
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Kick-off projektu', 'ws', '{}', 1, 1, 2, false),
  (2, 'Zebranie dostępów i konfiguracja środowisk', 'pm', '{}', 1, 1, 2, false),
  (3, 'Analiza dokumentacji wstępnej i konfiguracji', 'own', '{}', 1, 2, 3, false),
  (4, 'Kick-off zakończony', 'ms', '{}', 1, 1, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 0 and s.step_order = 1;

-- FAZA 1 — Discovery i Audyt Obecnego Stanu
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Audyt konfiguracji CRM (pipeline, pola, workflow)', 'config', '{CRM}', 1, 2, 4, false),
  (2, 'Inwentaryzacja properties, asocjacji i custom fields', 'own', '{CRM}', 2, 2, 2, false),
  (3, 'Warsztat mapowania procesu sprzedażowego as-is', 'ws', '{CRM,SPO}', 2, 2, 6, false),
  (4, 'Wywiady z handlowcami i key users', 'ws', '{CRM,SPO}', 2, 3, 4, false),
  (5, 'Warsztat diagnostyczny — Prospecting i kwalifikacja leadów', 'ws', '{SPO}', 1, 1, 5, false),
  (6, 'Warsztat diagnostyczny — Procesy sprzedażowe per linia', 'ws', '{SPO}', 1, 2, 5, false),
  (7, 'Warsztat diagnostyczny — Ofertowanie i akceptacja', 'ws', '{SPO}', 2, 2, 5, false),
  (8, 'Warsztat diagnostyczny — Account Management', 'ws', '{SPO}', 2, 3, 5, false),
  (9, 'Warsztat diagnostyczny — Integracja marketing–sprzedaż', 'ws', '{SPO}', 3, 3, 5, false),
  (10, 'Audyt API: endpointy, auth, rate limits, sandbox', 'config', '{INT}', 1, 2, 4, false),
  (11, 'Analiza struktury danych i field mapping as-is', 'own', '{INT}', 1, 2, 5, false),
  (12, 'Analiza wolumenów i kierunków synchronizacji', 'own', '{INT}', 2, 3, 3, false),
  (13, 'Analiza bazy kontaktów marketingowych (jakość, RODO)', 'own', '{MKT}', 1, 2, 3, false),
  (14, 'Analiza kampanii, narzędzi i kanałów reklamowych', 'own', '{MKT}', 2, 3, 2, false),
  (15, 'Analiza modułów ERP do wdrożenia', 'own', '{ERP}', 1, 2, 6, false),
  (16, 'Discovery zakończone — start projektowania', 'ms', '{}', 3, 3, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 1 and s.step_order = 1;

-- FAZA 2 — Projektowanie i Architektura
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Projekt modelu danych CRM (obiekty, pola, asocjacje)', 'own', '{CRM}', 3, 4, 5, false),
  (2, 'Projekt pipeline (etapy, entry/exit, mandatory fields)', 'ws', '{CRM,SPO}', 3, 4, 6, false),
  (3, 'Projekt automatyzacji Workflows', 'own', '{CRM}', 4, 4, 3, false),
  (4, 'Dokumentacja Koncepcji Konfiguracji (Target Setup)', 'own', '{CRM}', 4, 5, 4, false),
  (5, 'Warsztat projektowy — procesy sprzedażowe to-be', 'ws', '{SPO}', 3, 4, 6, false),
  (6, 'Praca własna — playbooki i model kwalifikacji leadów', 'own', '{SPO}', 4, 5, 15, false),
  (7, 'Projekt architektury integracji (flow, sync, triggery)', 'own', '{INT}', 3, 4, 6, false),
  (8, 'Specyfikacja techniczna: field mapping, transformacje', 'own', '{INT}', 3, 4, 6, false),
  (9, 'Projekt: unique ID, deduplication, security, retry', 'own', '{INT}', 4, 5, 7, false),
  (10, 'Projekt kampanii, lejka i nurturingu', 'own', '{MKT}', 3, 4, 4, false),
  (11, 'Projekt lead scoringu i modelu MQL/SQL', 'ws', '{MKT}', 4, 4, 4, false),
  (12, 'Projekt planu migracji danych', 'own', '{CRM,ERP}', 4, 5, 3, false),
  (13, 'Architektura zatwierdzona przez klienta (checkpoint)', 'ms', '{}', 5, 5, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 2 and s.step_order = 1;

-- FAZA 3 — Konfiguracja i Implementacja (Sprint 1)
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Sprint 1: Konfiguracja pipeline i mandatory fields', 'config', '{CRM}', 5, 6, 8, false),
  (2, 'Sprint 1: Konfiguracja Custom Objects i asocjacji', 'config', '{CRM}', 6, 7, 6, false),
  (3, 'Sprint 1: Budowa Workflows (notyfikacje, przypisania)', 'config', '{CRM}', 6, 7, 5, false),
  (4, 'Sprint 1: Konfiguracja widoków, kolejek, dashboardów', 'config', '{CRM}', 7, 7, 4, false),
  (5, 'Implementacja modułu ingestii i synchronizacji (backend)', 'config', '{INT}', 5, 7, 20, false),
  (6, 'Implementacja field mapping i transformacji danych', 'config', '{INT}', 6, 8, 15, false),
  (7, 'Implementacja error handling, retry i monitoringu', 'config', '{INT}', 7, 8, 10, false),
  (8, 'Konfiguracja landing pages, formularzy i CTA', 'config', '{MKT}', 5, 6, 6, false),
  (9, 'Konfiguracja kampanii emailowych i workflow nurturing', 'config', '{MKT}', 6, 7, 6, false),
  (10, 'Konfiguracja integracji z systemami reklamowymi', 'config', '{MKT}', 7, 7, 4, false),
  (11, 'Konfiguracja modułów ERP / SAP (widoki, uprawnienia)', 'config', '{ERP}', 5, 7, 20, false),
  (12, 'Konfiguracja raportów BI i dashboardów zarządczych', 'config', '{ERP}', 7, 8, 15, false),
  (13, 'Opracowanie playbooków sprzedażowych per linia', 'own', '{SPO}', 5, 7, 15, false),
  (14, 'Opracowanie kart kwalifikacji i Account Plan', 'own', '{SPO}', 6, 7, 10, false),
  (15, 'Sprint Review 1 — demo konfiguracji dla klienta', 'ms', '{}', 7, 7, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 3 and s.step_order = 1;

-- FAZA 3 — Konfiguracja i Implementacja (Sprint 2)
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Sprint 2: Konfiguracja raportów i dashboardów CRM', 'config', '{CRM}', 7, 8, 4, false),
  (2, 'Sprint 2: Konfiguracja sekwencji email i szablonów', 'config', '{CRM,MKT}', 7, 8, 4, false),
  (3, 'Sprint 2: Integracja CRM z M365 / systemami zewn.', 'config', '{CRM,ERP}', 8, 9, 3, false),
  (4, 'Proof of Concept — testy integracji na danych testowych', 'test', '{INT}', 7, 8, 6, false),
  (5, 'Deploy aplikacji integracyjnej (staging / prod)', 'config', '{INT}', 8, 9, 5, false),
  (6, 'Konfiguracja lead scoringu i pilotowa kampania (setup)', 'config', '{MKT}', 7, 9, 6, false),
  (7, 'Sprint Review 2 — akceptacja konfiguracji przed UAT', 'ms', '{}', 9, 9, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 3 and s.step_order = 2;

-- FAZA 4 — Migracja i Czyszczenie Danych
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Analiza Delta i opracowanie instrukcji migracji', 'own', '{CRM,ERP}', 8, 9, 6, false),
  (2, 'Czyszczenie danych po stronie klienta (z wsparciem BW)', 'own', '{CRM,ERP}', 9, 10, 4, false),
  (3, 'Fizyczna migracja danych (klient wg instrukcji)', 'own', '{CRM}', 9, 10, 4, false),
  (4, 'Automatyczna migracja wsadowa (ETL / batch import)', 'config', '{INT,ERP}', 9, 10, 8, false),
  (5, 'Weryfikacja kompletności danych po migracji', 'test', '{CRM,ERP}', 10, 10, 4, false),
  (6, 'Migracja danych zakończona — walidacja OK', 'ms', '{CRM}', 10, 10, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 4 and s.step_order = 1;

-- FAZA 5 — Testy i Odbiór (SIT / UAT)
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Przygotowanie scenariuszy SIT i UAT', 'own', '{}', 9, 9, 3, false),
  (2, 'Testy wewnętrzne SIT (BW)', 'test', '{}', 9, 10, 6, false),
  (3, 'Testy integracji end-to-end (happy path + edge cases)', 'test', '{INT}', 9, 10, 8, false),
  (4, 'Testy wydajnościowe i bezpieczeństwa', 'test', '{INT,ERP}', 10, 10, 6, false),
  (5, 'Sesja UAT z klientem — demo i testy akceptacyjne', 'ws', '{}', 10, 11, 6, false),
  (6, 'Iteracja poprawek post-UAT (fix + retest)', 'config', '{}', 10, 11, 4, false),
  (7, 'Testy pilotowej kampanii marketingowej', 'test', '{MKT}', 10, 11, 4, false),
  (8, 'UAT zakończony — formalna akceptacja klienta (sign-off)', 'ms', '{}', 11, 11, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 5 and s.step_order = 1;

-- FAZA 6 — Szkolenia i Zarządzanie Zmianą
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Opracowanie materiałów szkoleniowych i instrukcji', 'own', '{}', 10, 11, 4, false),
  (2, 'Szkolenie Train-the-Trainer (administratorzy klienta)', 'ws', '{}', 11, 11, 6, false),
  (3, 'Szkolenie handlowców / key users', 'ws', '{CRM,SPO}', 11, 12, 6, false),
  (4, 'Warsztat adopcji playbooku sprzedażowego', 'ws', '{SPO}', 11, 12, 6, false),
  (5, 'Szkolenie z marketing automation (kampanie, nurturing)', 'ws', '{MKT}', 11, 12, 6, false),
  (6, 'Szkolenie admina z zarządzania konfiguracją', 'ws', '{CRM,ERP}', 11, 12, 3, false)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 6 and s.step_order = 1;

-- FAZA 7 — Go-live i Hypercare
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Planowanie go-live (cutover, rollback, komunikacja)', 'own', '{}', 11, 12, 3, false),
  (2, 'Deaktywacja starego systemu / archiwizacja historii', 'config', '{CRM,ERP}', 12, 12, 2, false),
  (3, 'Uruchomienie produkcyjne (go-live)', 'config', '{}', 12, 12, 2, false),
  (4, 'Hypercare — wsparcie po go-live (pierwsze 2 tygodnie)', 'pm', '{}', 12, 14, 8, false),
  (5, 'GO-LIVE — system uruchomiony produkcyjnie', 'ms', '{}', 12, 12, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 7 and s.step_order = 1;

-- FAZA 8 — Zamknięcie Projektu
insert into step_task_templates (step_template_id, task_order, task_title, kind, applies_to_types, w_start, w_end, est, is_milestone)
select s.id, v.ord, v.title, v.kind::task_kind, v.types::impl_type[], v.ws, v.we, v.est::numeric, v.ms
from step_templates s cross join (values
  (1, 'Dokumentacja końcowa i techniczna systemu', 'own', '{}', 13, 13, 4, false),
  (2, 'Porównanie plan vs actual (h, budżet, harmonogram)', 'pm', '{}', 13, 13, 1, false),
  (3, 'Retrospektywa i lessons learned', 'ws', '{}', 13, 13, 2, false),
  (4, 'Formalny odbiór projektu — sign-off Sponsora', 'pm', '{}', 14, 14, 1, false),
  (5, 'Backlog rozwoju i roadmapa post-go-live', 'pm', '{}', 14, 14, 2, false),
  (6, 'Odbiór projektu — formalny sign-off Sponsora', 'ms', '{}', 14, 14, null, true)
) as v(ord, title, kind, types, ws, we, est, ms)
where s.phase_number = 8 and s.step_order = 1;

-- PODSUMOWANIE (do weryfikacji): klocki-fazy=10 + cykliczne=3; zadania=86; suma est=431h
