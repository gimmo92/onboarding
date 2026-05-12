create table if not exists public.onboarding_employees (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_workflows (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_document_templates (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_employees enable row level security;
alter table public.onboarding_workflows enable row level security;
alter table public.onboarding_document_templates enable row level security;

create policy "onboarding_employees_anon_all"
  on public.onboarding_employees
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "onboarding_workflows_anon_all"
  on public.onboarding_workflows
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "onboarding_document_templates_anon_all"
  on public.onboarding_document_templates
  for all
  to anon, authenticated
  using (true)
  with check (true);
