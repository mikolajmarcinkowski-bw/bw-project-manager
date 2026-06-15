-- =====================================================================
-- Hardening bezpieczeństwa (po audycie security-auditor, 2026-06-15).
-- 1) Blokada self-escalation roli/is_tester (KRYTYCZNE).
-- 2) handle_new_user NIE ufa roli z user_metadata (zaszyte 'user').
-- 3) UNIQUE na step_templates(phase_number, step_order) — chroni cross-join seeda.
-- =====================================================================

-- 1) Nie-admin NIE może zmienić sobie role ani is_tester.
-- RLS nie widzi OLD, więc potrzebny trigger. auth.uid() IS NULL = kontekst zaufany
-- (service_role / migracja / MCP) — wtedy zmiana dozwolona (bootstrap admina, zarządzanie rolami).
create or replace function protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.role := old.role;
    new.is_tester := old.is_tester;
  end if;
  return new;
end; $$;

create trigger trg_protect_profile_privileges
  before update on profiles
  for each row execute function protect_profile_privileges();

-- 2) Trigger rejestracji: rola zawsze 'user' (rolę podnosi tylko admin osobną operacją).
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
    'user'   -- NIE ufamy raw_user_meta_data.role (wektor eskalacji)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- 3) Zabezpieczenie seeda: jeden klocek-faza na (phase_number, step_order).
alter table step_templates add constraint step_templates_phase_order_uniq
  unique (phase_number, step_order);
