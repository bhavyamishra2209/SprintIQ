-- ══════════════════════════════════════════════════════════════════════
-- SprintIQ: Supabase Demo Seed Data
--
-- INSTRUCTIONS:
-- Replace ':owner_id' with your actual Supabase auth.users UUID before running.
-- Example in psql / Supabase SQL Editor:
--   \set owner_id 'your-user-uuid-here'
-- Or substitute ':owner_id' with '00000000-0000-0000-0000-000000000000'
--
-- This script mirrors the in-memory DEMO_PROJECT_ID seed data from demo_seed.py.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Demo Project Alpha
insert into public.projects (id, owner_id, name, description, jira_project_key, jira_board_id, last_synced_at)
values (
    '00000000-0000-0000-0000-000000000001'::uuid,
    ':owner_id'::uuid,
    'Project Alpha',
    'Intelligent project twin demonstration project',
    'ALPHA',
    101,
    now()
) on conflict (id) do nothing;

-- 2. Developers
insert into public.developers (id, project_id, jira_account_id, display_name, email, capacity_hours_per_sprint, is_active)
values
    ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'jira-dev-001', 'Alice Chen', 'alice@example.com', 40, true),
    ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'jira-dev-002', 'Bob Smith', 'bob@example.com', 40, true),
    ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'jira-dev-003', 'Charlie Dave', 'charlie@example.com', 40, true)
on conflict (id) do nothing;

-- 3. Sprints
insert into public.sprints (id, project_id, jira_sprint_id, name, state, start_date, end_date, goal)
values
    ('20000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 1, 'Sprint 1', 'closed', now() - interval '28 days', now() - interval '14 days', 'Initial foundation and core spec'),
    ('20000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 2, 'Sprint 2', 'active', now() - interval '13 days', now() + interval '1 day', 'Core services, integration and UAT')
on conflict (id) do nothing;

-- 4. Tasks (ALPHA-1 through ALPHA-8)
insert into public.tasks (id, project_id, jira_issue_key, jira_issue_id, title, description, status, status_category, issue_type, priority, story_points, estimate_hours, assignee_id, sprint_id)
values
    ('30000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-1', '10001', 'Requirements Specification', 'Define core functional requirements and constraints', 'done', 'Done', 'Story', 'High', 3.0, 12.0, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-2', '10002', 'Use Cases & Architecture Design', 'Architectural diagrams and end-to-end use case definition', 'done', 'Done', 'Story', 'High', 4.0, 16.0, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-3', '10003', 'Database Schema Implementation', 'PostgreSQL tables, indexes, triggers, and migrations', 'done', 'Done', 'Task', 'Highest', 5.0, 20.0, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-4', '10004', 'UI Frontend Integration', 'Build interactive React components and API connectors', 'in_progress', 'In Progress', 'Story', 'Medium', 6.0, 24.0, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid),
    ('30000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-5', '10005', 'Payment Service Gateway', 'Secure payment integration and webhook handlers', 'in_progress', 'In Progress', 'Story', 'High', 5.0, 20.0, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid),
    ('30000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-6', '10006', 'Localization & Multi-Language', 'Translation string keys and locale switching pipeline', 'blocked', 'Blocked', 'Story', 'Low', 3.0, 12.0, '10000000-0000-0000-0000-000000000003'::uuid, '20000000-0000-0000-0000-000000000002'::uuid),
    ('30000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-7', '10007', 'User Service & Authentication', 'JWT authentication and user profile management', 'todo', 'To Do', 'Story', 'Medium', 4.0, 16.0, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid),
    ('30000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'ALPHA-8', '10008', 'Deploy to UAT Environment', 'Docker packaging, cloud deployment, and sanity smoke tests', 'todo', 'To Do', 'Task', 'High', 2.0, 8.0, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid)
on conflict (id) do nothing;

-- 5. Dependencies (Valid DAG with 8 edges tagged 'jira')
insert into public.dependencies (id, project_id, from_task_id, to_task_id, type, tag)
values
    ('40000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000004'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000005'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000006'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000007'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000008'::uuid, 'blocks', 'jira'),
    ('40000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000007'::uuid, '30000000-0000-0000-0000-000000000008'::uuid, 'blocks', 'jira')
on conflict (id) do nothing;
