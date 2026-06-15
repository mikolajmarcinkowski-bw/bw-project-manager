-- =====================================================================
-- Tryb inspekcji dla testerów (zlecenie Mikołaja 2026-06-15).
-- Oznaczeni testerzy klikają element UI i zgłaszają uwagę → zapis do ui_feedback.
-- Podgląd: bez panelu w aplikacji — AI czyta bazę (service_role).
-- =====================================================================

-- Flaga testera na koncie (admin ją włącza wybranym osobom).
alter table profiles add column is_tester boolean not null default false;

create type feedback_category as enum ('bug', 'visual', 'content', 'ux');
create type feedback_priority as enum ('low', 'medium', 'high');
create type feedback_status   as enum ('new', 'in_progress', 'resolved');

create table ui_feedback (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references profiles on delete set null,
  page_path     text not null,            -- na której stronie (URL/route)
  css_selector  text,                     -- gdzie element jest w kodzie (ścieżka CSS)
  element_tag   text,                     -- np. button, div, span
  element_text  text,                     -- widoczny tekst klikniętego elementu
  comment       text not null,            -- co testerowi się nie podoba
  category      feedback_category,
  priority      feedback_priority not null default 'medium',
  viewport_w    int,                      -- szerokość okna
  viewport_h    int,                      -- wysokość okna
  user_agent    text,                     -- przeglądarka
  theme         text,                     -- 'light' | 'dark'
  status        feedback_status not null default 'new',
  created_at    timestamptz not null default now()
);
create index on ui_feedback (status);
create index on ui_feedback (page_path);

-- Pomocnik: czy bieżący user jest testerem (lub adminem)? SECURITY DEFINER (omija RLS na profiles).
create or replace function is_tester()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_tester or role in ('admin','dev_admin') from profiles where id = auth.uid()),
    false
  );
$$;

alter table ui_feedback enable row level security;

-- Tester/admin może dodać zgłoszenie (jako autor); odczyt tylko admin (AI i tak przez service_role).
create policy ui_feedback_insert on ui_feedback for insert to authenticated
  with check (is_tester() and author_id = auth.uid());
create policy ui_feedback_select_admin on ui_feedback for select to authenticated
  using (is_admin());
create policy ui_feedback_update_admin on ui_feedback for update to authenticated
  using (is_admin()) with check (is_admin());
