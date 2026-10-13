# SprintIQ: Supabase & Jira Setup Guide

SprintIQ is designed with a switchable architecture. It runs immediately out-of-the-box with **zero** external credentials using an in-process in-memory store and mock Jira fixtures. When you are ready, you can switch seamlessly to hosted Supabase and real Jira Cloud using environment variables only, without changing any code.

---

## Section 1: Run Now with No Credentials

The default configuration uses:
- `STORAGE_BACKEND=memory`
- `JIRA_USE_MOCK=true`

### 1.1 Start with Docker Compose
```bash
# From the repository root
docker compose build
docker compose up
```

### 1.2 Or Run Locally with Python
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 1.3 Verify Endpoints with Curl

**1. Check API Health:**
```bash
curl -X GET http://localhost:8000/health
# Expected Response:
# {"status":"ok","storage_backend":"memory","jira_mock":true}
```

**2. Check Jira Integration Health:**
```bash
curl -X GET http://localhost:8000/jira/health
# Expected Response:
# {"connected":true,"mock":true}
```

**3. Trigger Sync on Demo Project (DEMO_PROJECT_ID: `00000000-0000-0000-0000-000000000001`):**
```bash
curl -X POST http://localhost:8000/jira/projects/00000000-0000-0000-0000-000000000001/sync
# Expected Response:
# {"project_id":"00000000-0000-0000-0000-000000000001","synced_sprints":2,"synced_developers":3,"synced_tasks":8,"synced_dependencies":8,"warnings":[]}
```

**4. Check Sync Status:**
```bash
curl -X GET http://localhost:8000/jira/projects/00000000-0000-0000-0000-000000000001/status
```

**5. Query the Digital Twin Dependency Graph:**
```bash
curl -X GET http://localhost:8000/twin/projects/00000000-0000-0000-0000-000000000001/graph
# Returns nodes, edges, critical_path, total_duration_hours, and cycle status.
```

**6. Query Downstream Impact (e.g., ALPHA-3 task id `30000000-0000-0000-0000-000000000003`):**
```bash
curl -X GET http://localhost:8000/twin/projects/00000000-0000-0000-0000-000000000001/tasks/30000000-0000-0000-0000-000000000003/downstream
```

**7. Query Upstream Dependencies (e.g., ALPHA-8 task id `30000000-0000-0000-0000-000000000008`):**
```bash
curl -X GET http://localhost:8000/twin/projects/00000000-0000-0000-0000-000000000001/tasks/30000000-0000-0000-0000-000000000008/upstream
```

### 1.4 Run the Automated Test Suite
```bash
cd backend
pytest
```

---

## Section 2: Later: Switch to Supabase

When you create your Supabase project:

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com) and create a new project.
2. **Find API Keys & URL:**
   - Go to **Project Settings** > **API**.
   - Copy **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy the **service_role** secret key (needed by backend to bypass RLS for administrative synchronization).
   - Optionally copy the **anon** public key.
3. **Apply Database Migration:**
   - Open the **SQL Editor** in the Supabase Dashboard.
   - Copy and paste the contents of `supabase/migrations/0001_init_schema.sql` and run it.
   - (Optional): To seed demo data, replace `:owner_id` in `supabase/seed.sql` with your authenticated user UUID from `auth.users` and execute it.
4. **Configure Environment Variables:**
   - In `backend/.env` (or root `.env`):
     ```env
     STORAGE_BACKEND=supabase
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
     SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
5. **Restart Backend:**
   - Restart Uvicorn or run `docker compose up --build`. The backend will now automatically persist all projects, developers, sprints, tasks, and dependency edges in Supabase PostgreSQL.

---

## Section 3: Later: Switch to Real Jira Cloud

When you are ready to connect to your live Jira Cloud instance:

1. **Generate Jira API Token:**
   - Log into [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
   - Create an API token and copy it.
2. **Locate Jira Project & Custom Field IDs:**
   - Identify your Jira project key (e.g., `ALPHA`, `PROJ`).
   - Find your agile board ID under board settings (e.g., `101`).
   - In Jira Settings > Issues > Custom Fields, locate the custom field IDs for Story Points (typically `customfield_10016`) and Sprint (typically `customfield_10020`).
3. **Configure Environment Variables:**
   - In `backend/.env`:
     ```env
     JIRA_USE_MOCK=false
     JIRA_BASE_URL=https://your-domain.atlassian.net
     JIRA_EMAIL=your-email@example.com
     JIRA_API_TOKEN=your-jira-api-token
     JIRA_STORY_POINTS_FIELD=customfield_10016
     JIRA_SPRINT_FIELD=customfield_10020
     JIRA_HOURS_PER_STORY_POINT=4.0
     ```
4. **Trigger Live Sync:**
   - Send `POST /jira/projects/{project_id}/sync`. SprintIQ will fetch active sprints, assignable users, issues with ADF descriptions, and issue links (`Blocks`, `Depends`), building the digital twin graph automatically.
