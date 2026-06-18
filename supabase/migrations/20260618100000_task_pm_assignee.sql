-- Dodaje pole pm_assignee_id do tasks (P8 rozszerzenie — D-057)
-- Konsultant/wykonawca: assignee_name (text, FK do team_members po nazwie)
-- PM nadzorujący:       pm_assignee_id (UUID, FK do profiles)

alter table tasks
  add column pm_assignee_id uuid references profiles (id) on delete set null;

create index on tasks (pm_assignee_id) where pm_assignee_id is not null;

comment on column tasks.pm_assignee_id is 'PM nadzorujący zadanie (konto w profiles) — oddzielny od konsultanta wykonującego (assignee_name → team_members)';
