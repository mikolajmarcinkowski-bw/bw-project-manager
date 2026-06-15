-- =====================================================================
-- BW Project Manager — RLS + trigger profiles
-- R13: każdy zalogowany PM widzi i edytuje WSZYSTKIE projekty (mały zespół + kontrolna wieża).
-- Szablony/pula/kalendarz: read dla wszystkich, write tylko admin/dev_admin.
-- service_role (admin client + MCP server) omija RLS z definicji.
-- =====================================================================

-- Rola bieżącego usera — SECURITY DEFINER omija RLS na profiles (brak rekursji w politykach).
create or replace function current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from profiles where id = auth.uid()) in ('admin', 'dev_admin'), false);
$$;

-- ---------------------------------------------------------------------
-- Auto-tworzenie profilu przy rejestracji w auth.users
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- Włącz RLS na wszystkich tabelach
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','team_members','clients','projects','project_pms','project_types',
    'step_templates','step_task_templates','project_steps','tasks','decision_points',
    'project_documents','change_requests','risks','milestones','kpis',
    'budget_settings','budget_lines','task_role_assignments','stakeholders',
    'escalation_levels','meetings','communications','questions_doubts',
    'maintenance_packages','ai_project_suggestions','external_refs',
    'working_calendar','activity_log'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- PROFILES — czytają wszyscy zalogowani; edycja: self lub admin
-- ---------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy profiles_admin_insert on profiles for insert to authenticated with check (is_admin());
create policy profiles_admin_delete on profiles for delete to authenticated using (is_admin());

-- ---------------------------------------------------------------------
-- DANE PROJEKTÓW — pełny dostęp dla każdego zalogowanego (R13)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','project_pms','project_types','project_steps','tasks',
    'decision_points','project_documents','change_requests','risks','milestones',
    'kpis','budget_settings','budget_lines','task_role_assignments','stakeholders',
    'escalation_levels','meetings','communications','questions_doubts',
    'maintenance_packages','ai_project_suggestions','external_refs'
  ] loop
    execute format(
      'create policy %1$s_all on %1$I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- SZABLONY / PULA / KALENDARZ — read wszyscy, write tylko admin
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['step_templates','step_task_templates','team_members','working_calendar'] loop
    execute format('create policy %1$s_select on %1$I for select to authenticated using (true);', t);
    execute format('create policy %1$s_admin_write on %1$I for all to authenticated using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- ACTIVITY LOG — read wszyscy zalogowani; insert dozwolony; brak update/delete
-- ---------------------------------------------------------------------
create policy activity_log_select on activity_log for select to authenticated using (true);
create policy activity_log_insert on activity_log for insert to authenticated with check (true);
