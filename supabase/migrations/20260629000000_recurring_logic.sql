-- =============================================================================
-- P12: Pełna logika klocków cyklicznych + working_calendar (D-038, D-043)
-- =============================================================================

-- 1. Dodaj pola kadencji do step_templates (szablony)
alter table step_templates
  add column if not exists recurring_period       text check (recurring_period in ('weekly','biweekly')),
  add column if not exists recurring_anchor_day   smallint check (recurring_anchor_day between 1 and 5);
  -- anchor_day: 1=pon, 2=wt, 3=śr, 4=czw, 5=pt

-- 2. Dodaj pola do project_steps (instancje)
alter table project_steps
  add column if not exists recurring_period             text check (recurring_period in ('weekly','biweekly')),
  add column if not exists recurring_anchor_day         smallint check (recurring_anchor_day between 1 and 5),
  add column if not exists recurring_occurrence_index   smallint;

-- 3. Zaktualizuj istniejące szablony cykliczne z kadencją
--    (nazwy muszą pasować 1:1 do seed_templates.sql)
update step_templates
  set recurring_period = 'weekly', recurring_anchor_day = 4   -- czwartek = 4
  where step_title = 'Raport statusu tygodniowy (mail co czwartek)'
    and is_recurring = true;

update step_templates
  set recurring_period = 'weekly', recurring_anchor_day = 5   -- piątek = 5
  where step_title = 'Piątkowe podsumowanie finansowe/godzinowe'
    and is_recurring = true;

update step_templates
  set recurring_period = 'biweekly', recurring_anchor_day = 1 -- poniedziałek = 1
  where step_title = 'Spotkanie przyrostowe z klientem'
    and is_recurring = true;

-- 4. Seed working_calendar — polskie dni ustawowo wolne 2025–2027
--    Stałe święta
insert into working_calendar (day, is_working_day, label) values
  -- 2025
  ('2025-01-01', false, 'Nowy Rok'),
  ('2025-01-06', false, 'Trzech Króli'),
  ('2025-05-01', false, 'Święto Pracy'),
  ('2025-05-03', false, 'Święto Konstytucji 3 Maja'),
  ('2025-08-15', false, 'Wniebowzięcie NMP'),
  ('2025-11-01', false, 'Wszystkich Świętych'),
  ('2025-11-11', false, 'Święto Niepodległości'),
  ('2025-12-25', false, 'Boże Narodzenie'),
  ('2025-12-26', false, 'Drugi dzień Bożego Narodzenia'),
  -- 2026
  ('2026-01-01', false, 'Nowy Rok'),
  ('2026-01-06', false, 'Trzech Króli'),
  ('2026-05-01', false, 'Święto Pracy'),
  ('2026-05-03', false, 'Święto Konstytucji 3 Maja'),
  ('2026-08-15', false, 'Wniebowzięcie NMP'),
  ('2026-11-01', false, 'Wszystkich Świętych'),
  ('2026-11-11', false, 'Święto Niepodległości'),
  ('2026-12-25', false, 'Boże Narodzenie'),
  ('2026-12-26', false, 'Drugi dzień Bożego Narodzenia'),
  -- 2027
  ('2027-01-01', false, 'Nowy Rok'),
  ('2027-01-06', false, 'Trzech Króli'),
  ('2027-05-01', false, 'Święto Pracy'),
  ('2027-05-03', false, 'Święto Konstytucji 3 Maja'),
  ('2027-08-15', false, 'Wniebowzięcie NMP'),
  ('2027-11-01', false, 'Wszystkich Świętych'),
  ('2027-11-11', false, 'Święto Niepodległości'),
  ('2027-12-25', false, 'Boże Narodzenie'),
  ('2027-12-26', false, 'Drugi dzień Bożego Narodzenia')
on conflict (day) do nothing;

--    Ruchome święta (pochodne Wielkanocy)
--    2025: Wielkanoc = 20 kwietnia
--      Poniedziałek Wielkanocny = +1 = 21 kwi (pon)
--      Boże Ciało               = +60 = 19 cze (czw)
--    2026: Wielkanoc = 5 kwietnia
--      Poniedziałek Wielkanocny = +1 = 6 kwi (pon)
--      Boże Ciało               = +60 = 4 cze (czw)
--    2027: Wielkanoc = 28 marca
--      Poniedziałek Wielkanocny = +1 = 29 mar (pon)
--      Boże Ciało               = +60 = 27 maj (czw)
insert into working_calendar (day, is_working_day, label) values
  ('2025-04-21', false, 'Poniedziałek Wielkanocny'),
  ('2025-06-19', false, 'Boże Ciało'),
  ('2026-04-06', false, 'Poniedziałek Wielkanocny'),
  ('2026-06-04', false, 'Boże Ciało'),
  ('2027-03-29', false, 'Poniedziałek Wielkanocny'),
  ('2027-05-27', false, 'Boże Ciało')
on conflict (day) do nothing;
