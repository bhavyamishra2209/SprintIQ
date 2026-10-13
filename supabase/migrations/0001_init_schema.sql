-- ══════════════════════════════════════════════════════════════════════
-- SprintIQ: Supabase Initial Schema & Database Migrations
-- Migration: 0001_init_schema.sql
--
-- NOTE:
-- The SprintIQ backend communicates via the Supabase Service-Role key,
-- which bypasses Row Level Security (RLS). RLS policies defined here
-- safeguard direct client / Supabase Studio / PostgREST anon access.
-- ══════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper function: set_updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ── 1. Profiles Table (Linked to auth.users) ───────────────────────────
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    created_at timestamptz not null default now()
);

-- Trigger: Automatically create public.profiles row when auth.users is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (new.id, new.raw_user_meta_data->>'full_name', new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── 2. Projects Table ──────────────────────────────────────────────────
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete cascade,
    name text not null,
    description text,
    jira_project_key text,
    jira_board_id integer,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_projects_owner_jira_key unique (owner_id, jira_project_key)
);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

-- ── 3. Developers Table ────────────────────────────────────────────────
create table if not exists public.developers (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    jira_account_id text,
    display_name text not null,
    email text,
    capacity_hours_per_sprint numeric default 40 check (capacity_hours_per_sprint >= 0),
    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_developers_project_jira_account unique (project_id, jira_account_id)
);

drop trigger if exists set_developers_updated_at on public.developers;
create trigger set_developers_updated_at
    before update on public.developers
    for each row execute function public.set_updated_at();

-- ── 4. Sprints Table ───────────────────────────────────────────────────
create table if not exists public.sprints (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    jira_sprint_id integer,
    name text not null,
    state text not null default 'future' check (state in ('future', 'active', 'closed')),
    start_date timestamptz,
    end_date timestamptz,
    goal text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_sprints_project_jira_sprint unique (project_id, jira_sprint_id)
);

drop trigger if exists set_sprints_updated_at on public.sprints;
create trigger set_sprints_updated_at
    before update on public.sprints
    for each row execute function public.set_updated_at();

-- ── 5. Tasks Table ─────────────────────────────────────────────────────
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    jira_issue_key text,
    jira_issue_id text,
    title text not null,
    description text,
    status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'blocked')),
    status_category text,
    issue_type text,
    priority text,
    story_points numeric check (story_points is null or story_points >= 0),
    estimate_hours numeric check (estimate_hours is null or estimate_hours >= 0),
    assignee_id uuid references public.developers(id) on delete set null,
    sprint_id uuid references public.sprints(id) on delete set null,
    due_date timestamptz,
    jira_created_at timestamptz,
    jira_updated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_tasks_project_jira_key unique (project_id, jira_issue_key)
);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row execute function public.set_updated_at();

-- ── 6. Dependencies (Dependency Graph Edges) ───────────────────────────
-- Semantics: from_task_id must complete BEFORE to_task_id can start
create table if not exists public.dependencies (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    from_task_id uuid not null references public.tasks(id) on delete cascade,
    to_task_id uuid not null references public.tasks(id) on delete cascade,
    type text not null default 'blocks',
    tag text,
    created_at timestamptz not null default now(),
    constraint chk_dependencies_no_self_loop check (from_task_id <> to_task_id),
    constraint uq_dependencies_edge unique (from_task_id, to_task_id, type)
);

-- ── 7. Scenarios & Results (Future Simulation Features) ────────────────
create table if not exists public.scenarios (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    name text not null,
    scenario_type text,
    params jsonb default '{}'::jsonb,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.results (
    id uuid primary key default gen_random_uuid(),
    scenario_id uuid not null references public.scenarios(id) on delete cascade,
    metrics jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────
create index if not exists idx_projects_owner_id on public.projects(owner_id);
create index if not exists idx_developers_project_id on public.developers(project_id);
create index if not exists idx_sprints_project_id on public.sprints(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_sprint_id on public.tasks(sprint_id);
create index if not exists idx_tasks_project_status on public.tasks(project_id, status);
create index if not exists idx_dependencies_project_id on public.dependencies(project_id);
create index if not exists idx_dependencies_from_task on public.dependencies(from_task_id);
create index if not exists idx_dependencies_to_task on public.dependencies(to_task_id);
create index if not exists idx_scenarios_project_id on public.scenarios(project_id);
create index if not exists idx_results_scenario_id on public.results(scenario_id);

-- ── Row Level Security (RLS) ───────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.developers enable row level security;
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.dependencies enable row level security;
alter table public.scenarios enable row level security;
alter table public.results enable row level security;

-- Profiles: Users can view and update their own profile
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
    for select using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
    for update using (auth.uid() = id);

-- Projects: Tenant isolation by project owner
drop policy if exists "Users manage own projects" on public.projects;
create policy "Users manage own projects" on public.projects
    for all using (owner_id = auth.uid());

-- Developers: Access scoped to project owner
drop policy if exists "Users manage developers in own projects" on public.developers;
create policy "Users manage developers in own projects" on public.developers
    for all using (
        exists (select 1 from public.projects where projects.id = developers.project_id and projects.owner_id = auth.uid())
    );

-- Sprints: Access scoped to project owner
drop policy if exists "Users manage sprints in own projects" on public.sprints;
create policy "Users manage sprints in own projects" on public.sprints
    for all using (
        exists (select 1 from public.projects where projects.id = sprints.project_id and projects.owner_id = auth.uid())
    );

-- Tasks: Access scoped to project owner
drop policy if exists "Users manage tasks in own projects" on public.tasks;
create policy "Users manage tasks in own projects" on public.tasks
    for all using (
        exists (select 1 from public.projects where projects.id = tasks.project_id and projects.owner_id = auth.uid())
    );

-- Dependencies: Access scoped to project owner
drop policy if exists "Users manage dependencies in own projects" on public.dependencies;
create policy "Users manage dependencies in own projects" on public.dependencies
    for all using (
        exists (select 1 from public.projects where projects.id = dependencies.project_id and projects.owner_id = auth.uid())
    );

-- Scenarios: Access scoped to project owner
drop policy if exists "Users manage scenarios in own projects" on public.scenarios;
create policy "Users manage scenarios in own projects" on public.scenarios
    for all using (
        exists (select 1 from public.projects where projects.id = scenarios.project_id and projects.owner_id = auth.uid())
    );

-- Results: Access scoped to project owner through scenarios
drop policy if exists "Users manage results in own scenarios" on public.results;
create policy "Users manage results in own scenarios" on public.results
    for all using (
        exists (
            select 1 from public.scenarios
            join public.projects on projects.id = scenarios.project_id
            where scenarios.id = results.scenario_id and projects.owner_id = auth.uid()
        )
    );
