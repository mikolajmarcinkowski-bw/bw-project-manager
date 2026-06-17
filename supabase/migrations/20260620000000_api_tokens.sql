-- api_tokens: per-user tokeny dla serwera MCP (D-032, D-033)
create table if not exists api_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique default gen_random_uuid()::text,
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now(),
  revoked_at timestamptz
);

create index on api_tokens (token) where revoked_at is null;

alter table api_tokens enable row level security;

-- Każdy PM widzi i zarządza tylko swoimi tokenami
create policy "api_tokens_user_all" on api_tokens
  for all using (auth.uid() = user_id);
