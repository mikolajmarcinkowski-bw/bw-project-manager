-- =====================================================================
-- BW Project Manager — schemat bazy (DDL)
-- Źródła prawdy (pogodzone): PRD 04-spec.md §6 + rewizje D-051 (kształt encji core),
-- data-model.md (detal kolumn encji-dokumentów), mcp-tools.md (nazwy pól + kontrakt API).
-- Reguły: R1 (wewnętrzna), R3 (równoległość), R13 (każdy PM widzi wszystko), R15 (auto-insert union typów).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role          as enum ('dev_admin', 'admin', 'user');           -- D-033: brak client/specialist
create type impl_type          as enum ('CRM', 'SPO', 'INT', 'MKT', 'ERP');       -- typy wdrożenia (D-020)
create type project_status      as enum ('active', 'completed', 'archived');       -- D-051
create type project_variant     as enum ('standard', 'dev');                       -- P22 projekty deweloperskie
create type step_status         as enum ('todo', 'in_progress', 'done', 'skipped');
create type task_status         as enum ('todo', 'in_progress', 'done', 'for_quality', 'na'); -- spójne z Jira + na
create type task_kind           as enum ('ws', 'own', 'config', 'test', 'ms', 'pm');
create type decision_type       as enum ('uat', 'change_request', 'deviation', 'other');
create type decision_status     as enum ('pending', 'yes', 'no');
create type cr_type             as enum ('scope', 'timeline', 'budget', 'arch', 'resource', 'other');
create type cr_impact           as enum ('low', 'medium', 'high');
create type cr_status           as enum ('draft', 'pending', 'approved', 'rejected', 'implemented');
create type approval_status     as enum ('pending', 'approved', 'rejected');
create type rag                 as enum ('R', 'A', 'G');
create type risk_status         as enum ('open', 'monitor', 'closed');
create type milestone_status    as enum ('on', 'at', 'off', 'done');               -- on/at/off track + done
create type kpi_status          as enum ('on', 'at', 'off', 'done');
create type rate_type           as enum ('K', 'W', 'D');                           -- konsultant/wdrożeniowiec/deweloper
create type raci                as enum ('R', 'A', 'C', 'I');
create type stakeholder_cat     as enum ('kp', 'ks', 'ki', 'mo');                  -- kluczowy partner/sponsor/interesariusz/obserwator
create type question_status     as enum ('open', 'closed');
create type external_system     as enum ('jira', 'gmail', 'gcal', 'clockify');     -- V2

-- ---------------------------------------------------------------------
-- PROFILES (rozszerzenie auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  full_name   text,
  role        user_role not null default 'user',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TEAM MEMBERS (pula PM/specjalistów — informacyjna, A3; nie konta)
-- ---------------------------------------------------------------------
create table team_members (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  role        text,                       -- np. PM, Konsultant, Deweloper
  is_pm       boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CLIENTS (teczki)
-- ---------------------------------------------------------------------
create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  nip         text,                       -- P1: opcjonalny
  hubspot_url text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROJECTS (BEZ pm_id, BEZ active_step_id — D-051)
-- ---------------------------------------------------------------------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  client_id    uuid not null references clients on delete cascade,
  status       project_status not null default 'active',
  variant      project_variant not null default 'standard',  -- P22
  start_date   date,
  end_date     date,
  description  text,
  archived_by  uuid references profiles,
  archived_at  timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on projects (client_id);
create index on projects (status);

-- PM-owie projektu (m:n) — D-040, set_project_pms
create table project_pms (
  project_id  uuid not null references projects on delete cascade,
  profile_id  uuid not null references profiles on delete cascade,
  primary key (project_id, profile_id)
);

-- Typy wdrożenia projektu (m:n) — steruje auto-insertem (D-020, R15)
create table project_types (
  project_id  uuid not null references projects on delete cascade,
  type        impl_type not null,
  primary key (project_id, type)
);

-- ---------------------------------------------------------------------
-- SZABLONY (pula — source of truth dla auto-insertu)
-- ---------------------------------------------------------------------
create table step_templates (
  id              uuid primary key default gen_random_uuid(),
  phase_number    int not null,
  phase_name      text not null,
  step_order      int not null,
  step_title      text not null,
  kind            text,                          -- typ klocka (np. ws/own/ms/pm) — mcp add_steps_to_project
  owner_role      text,                          -- AE | PM | KT | DO | KL
  tags            text[] not null default '{}',
  applies_to_types impl_type[] not null default '{}', -- R15: które typy wstawiają ten klocek (puste = wszystkie)
  is_decision     boolean not null default false,
  is_required     boolean not null default true,
  is_recurring    boolean not null default false, -- D-038 klocki cykliczne
  is_parallel     boolean not null default false  -- R3 Realizacja ∥ Kontrola
);

create table step_task_templates (
  id                uuid primary key default gen_random_uuid(),
  step_template_id  uuid not null references step_templates on delete cascade,
  task_order        int not null,
  task_title        text not null,
  kind              task_kind not null default 'own',
  applies_to_types  impl_type[] not null default '{}', -- R15: union zadań wg typów
  w_start           int,                  -- offset tygodni
  w_end             int,
  est               numeric,              -- estymacja godzin
  is_milestone      boolean not null default false
);

-- ---------------------------------------------------------------------
-- INSTANCJE: KLOCKI (project_steps) — is_active zamiast active_step_id (D-051)
-- ---------------------------------------------------------------------
create table project_steps (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects on delete cascade,
  step_template_id  uuid references step_templates on delete set null, -- null = custom
  phase_number      int not null,
  phase_name        text not null,
  step_order        int not null,
  step_title        text not null,
  kind              text,                            -- mcp add_steps_to_project steps[].kind
  status            step_status not null default 'todo',
  is_active         boolean not null default false,  -- D-051: wiele aktywnych równolegle
  is_recurring      boolean not null default false,  -- D-038
  is_parallel       boolean not null default false,  -- R3
  is_decision       boolean not null default false,
  assigned_to       uuid references profiles,
  due_date          date,
  notes             text,
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index on project_steps (project_id);
create index on project_steps (project_id, is_active);

-- ---------------------------------------------------------------------
-- ZADANIA (tasks) — jedna wzbogacona tabela (nazwy pól wg mcp-tools)
-- Daty PMI (early/late start/finish) = V2 → pominięte.
-- ---------------------------------------------------------------------
create table tasks (
  id              uuid primary key default gen_random_uuid(),
  step_id         uuid not null references project_steps on delete cascade,
  project_id      uuid not null references projects on delete cascade, -- denormalizacja: szybkie zapytania portfela/briefu
  task_order      int not null default 0,
  title           text not null,
  kind            task_kind not null default 'own',
  type            impl_type[] not null default '{}',      -- typy wdrożenia (R15)
  w_start         int,                                    -- offset tygodni
  w_end           int,
  est             numeric,                                -- estymacja godzin
  is_milestone    boolean not null default false,
  status          task_status not null default 'todo',
  assignee_name   text,                                   -- P8 (obowiązkowe w UI)
  completion_date date,                                   -- P8
  due_date        date,                                   -- P10 alert (żółty ≤2dni / czerwony po terminie)
  hidden          boolean not null default false,         -- P9 / R4 (na = hidden)
  note            text,
  warning_muted   boolean not null default false,         -- P19 / R5b
  muted_by        uuid references profiles,
  muted_at        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on tasks (step_id);
create index on tasks (project_id);
create index on tasks (due_date) where status <> 'done' and status <> 'na';

-- ---------------------------------------------------------------------
-- DIAMENCIKI — decyzje (P11)
-- ---------------------------------------------------------------------
create table decision_points (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  step_id     uuid references project_steps on delete set null,
  type        decision_type not null,
  title       text not null,
  status      decision_status not null default 'pending',
  decided_by  uuid references profiles,
  decided_at  timestamptz,
  notes       text,
  created_at  timestamptz not null default now()
);
create index on decision_points (project_id);

-- ---------------------------------------------------------------------
-- DOKUMENTY (upload + generowane)
-- ---------------------------------------------------------------------
create table project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  type         text not null,            -- SOW|PDP|RAID|harmonogram|governance|raci|budget|kpi|...
  name         text not null,
  storage_path text,                     -- ścieżka w Supabase Storage (upload)
  content      jsonb,                    -- generowana treść (generate_document_content)
  uploaded_by  uuid references profiles,
  created_at   timestamptz not null default now()
);
create index on project_documents (project_id);

-- ---------------------------------------------------------------------
-- CHANGE REQUESTS (D-014) — dual approval BW + klient
-- ---------------------------------------------------------------------
create table change_requests (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects on delete cascade,
  cr_number            text,
  title                text not null,
  description          text,
  current_state        text,
  desired_state        text,
  business_rationale   text,
  cr_type              cr_type not null default 'other',
  impact_level         cr_impact,
  impact_hours         int,
  impact_cost          numeric,
  schedule_impact      text,
  submitted_by         uuid references profiles,
  submitted_date       date default current_date,
  status               cr_status not null default 'draft',
  bw_approval          approval_status,
  bw_approver          uuid references profiles,
  bw_approval_date     date,
  client_approval      approval_status,
  client_approver      text,             -- imię klienta (zewnętrzny)
  client_approval_date date,
  implementation_plan  text,
  actual_close_date    date,
  notes                text,             -- mcp update_change_request notes?
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on change_requests (project_id);

-- ---------------------------------------------------------------------
-- RISKS (RAID Log)
-- ---------------------------------------------------------------------
create table risks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  description  text not null,
  category     text,
  phase        text,
  probability  int check (probability between 1 and 5),
  impact       int check (impact between 1 and 5),
  score        int generated always as (probability * impact) stored,
  rag          rag,
  owner        text,
  mitigation   text,
  status       risk_status not null default 'open',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on risks (project_id);

-- ---------------------------------------------------------------------
-- MILESTONES (MS0–MS7) — synch z tasks.is_milestone
-- ---------------------------------------------------------------------
create table milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  ms_code      text,                 -- MS0..MS7
  name         text not null,
  target_date  date,
  week         int,
  status       milestone_status not null default 'on',
  task_id      uuid references tasks on delete set null,
  created_at   timestamptz not null default now()
);
create index on milestones (project_id);

-- ---------------------------------------------------------------------
-- KPIs
-- ---------------------------------------------------------------------
create table kpis (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  name         text not null,
  target       text,
  actual_value text,
  status       kpi_status not null default 'on',
  notes        text,
  created_at   timestamptz not null default now()
);
create index on kpis (project_id);

-- ---------------------------------------------------------------------
-- BUDŻET
-- ---------------------------------------------------------------------
create table budget_settings (
  project_id      uuid primary key references projects on delete cascade,
  rate_k          numeric,
  rate_w          numeric,
  rate_d          numeric,
  buffer_pct      numeric default 0,
  pm_overhead_pct numeric default 0,
  budget_max      numeric,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table budget_lines (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  task_id      uuid references tasks on delete set null,
  phase        text,
  rate_type    rate_type not null,
  est_h        numeric,
  actual_h     numeric default 0,
  description  text,
  created_at   timestamptz not null default now()
);
create index on budget_lines (project_id);

-- ---------------------------------------------------------------------
-- RACI (task_role_assignments) — V2 edycja, schemat teraz
-- ---------------------------------------------------------------------
create table task_role_assignments (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks on delete cascade,
  role      text not null,             -- SP|PM|ARCH|SPEC|BPO|IT|USR|QA
  raci      raci not null,
  unique (task_id, role)
);

-- ---------------------------------------------------------------------
-- STAKEHOLDERS (Power/Interest)
-- ---------------------------------------------------------------------
create table stakeholders (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects on delete cascade,
  name         text not null,
  category     stakeholder_cat,
  role         text,
  interest     text,
  expectations text,
  created_at   timestamptz not null default now()
);
create index on stakeholders (project_id);

-- ---------------------------------------------------------------------
-- GOVERNANCE / ESKALACJA
-- ---------------------------------------------------------------------
create table escalation_levels (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  level       int not null,
  trigger     text,
  channel     text,
  owner       text,
  created_at  timestamptz not null default now()
);
create index on escalation_levels (project_id);

create table meetings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  name        text not null,
  cadence     text,
  channel     text,
  owner       text,
  created_at  timestamptz not null default now()
);
create index on meetings (project_id);

create table communications (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  channel     text,
  cadence     text,
  audience    text,
  owner       text,
  created_at  timestamptz not null default now()
);
create index on communications (project_id);

-- ---------------------------------------------------------------------
-- PYTANIA / WĄTPLIWOŚCI (RAG)
-- ---------------------------------------------------------------------
create table questions_doubts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  asked_date  date default current_date,
  question    text not null,
  answer      text,
  rag         rag,
  status      question_status not null default 'open',
  created_at  timestamptz not null default now()
);
create index on questions_doubts (project_id);

-- ---------------------------------------------------------------------
-- MAINTENANCE (Faza 06) — rollover ≤ 1 miesiąc
-- ---------------------------------------------------------------------
create table maintenance_packages (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects on delete cascade,
  month          text not null,         -- YYYY-MM
  hours_base     numeric not null default 0,
  hours_rollover numeric not null default 0,
  hours_used     numeric not null default 0,
  created_at     timestamptz not null default now(),
  unique (project_id, month)
);

-- ---------------------------------------------------------------------
-- AI SUGGESTIONS — ślad propozycji Claude (zapisywany przez MCP)
-- ---------------------------------------------------------------------
create table ai_project_suggestions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects on delete cascade,
  suggested_steps jsonb,
  accepted_steps  jsonb,
  diff_summary    text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EXTERNAL REFS (V2 — endpointy gotowe teraz, D-042)
-- ---------------------------------------------------------------------
create table external_refs (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null,             -- 'task' | 'project' | ...
  entity_id   uuid not null,
  system      external_system not null,
  external_id text not null,
  sync_status text,
  created_at  timestamptz not null default now()
);
create index on external_refs (entity, entity_id);

-- ---------------------------------------------------------------------
-- WORKING CALENDAR (D-043 — przesuwa klocki cykliczne)
-- ---------------------------------------------------------------------
create table working_calendar (
  day            date primary key,
  is_working_day boolean not null default true,
  label          text                    -- np. nazwa święta / długi weekend
);

-- ---------------------------------------------------------------------
-- ACTIVITY LOG (A4 / D-025 / R1)
-- ---------------------------------------------------------------------
create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  actor_id    uuid references profiles,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index on activity_log (entity, entity_id);
create index on activity_log (created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_projects_updated         before update on projects        for each row execute function set_updated_at();
create trigger trg_tasks_updated            before update on tasks           for each row execute function set_updated_at();
create trigger trg_change_requests_updated  before update on change_requests for each row execute function set_updated_at();
create trigger trg_risks_updated            before update on risks           for each row execute function set_updated_at();
create trigger trg_budget_settings_updated  before update on budget_settings for each row execute function set_updated_at();
