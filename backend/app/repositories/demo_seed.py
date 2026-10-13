"""Demo seed data for Project Alpha.

Seeds an initial in-memory dataset with a valid 8-task DAG:
Requirements → Use Cases → Data Schema → UI Frontend / Payment Service
→ Localization → User Service → Deploy to UAT.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from app.repositories.in_memory import InMemoryStore, get_in_memory_store
from app.schemas.domain import Dependency, Developer, Project, Sprint, Task

# Fixed Demo Project UUID for zero-credential development
DEMO_PROJECT_ID = UUID("00000000-0000-0000-0000-000000000001")


async def seed_demo_data(store: Optional[InMemoryStore] = None) -> None:
    """Populate store with Project Alpha demo dataset."""
    target_store = store or get_in_memory_store()

    # Avoid duplicate seeding if project already exists
    if DEMO_PROJECT_ID in target_store.projects:
        return

    now = datetime.now(timezone.utc)

    # 1. Project Alpha
    project = Project(
        id=DEMO_PROJECT_ID,
        name="Project Alpha",
        description="SprintIQ intelligent software project digital twin demo",
        jira_project_key="ALPHA",
        jira_board_id=101,
        last_synced_at=now,
        created_at=now - timedelta(days=30),
        updated_at=now,
    )
    target_store.projects[project.id] = project

    # 2. Developers
    dev1 = Developer(
        id=UUID("10000000-0000-0000-0000-000000000001"),
        project_id=DEMO_PROJECT_ID,
        jira_account_id="jira-dev-001",
        display_name="Alice Chen",
        email="alice@example.com",
        capacity_hours_per_sprint=40.0,
        is_active=True,
    )
    dev2 = Developer(
        id=UUID("10000000-0000-0000-0000-000000000002"),
        project_id=DEMO_PROJECT_ID,
        jira_account_id="jira-dev-002",
        display_name="Bob Smith",
        email="bob@example.com",
        capacity_hours_per_sprint=40.0,
        is_active=True,
    )
    dev3 = Developer(
        id=UUID("10000000-0000-0000-0000-000000000003"),
        project_id=DEMO_PROJECT_ID,
        jira_account_id="jira-dev-003",
        display_name="Charlie Dave",
        email="charlie@example.com",
        capacity_hours_per_sprint=40.0,
        is_active=True,
    )
    for d in (dev1, dev2, dev3):
        target_store.developers[d.id] = d

    # 3. Sprints
    sprint1 = Sprint(
        id=UUID("20000000-0000-0000-0000-000000000001"),
        project_id=DEMO_PROJECT_ID,
        jira_sprint_id=1,
        name="Sprint 1",
        state="closed",
        start_date=now - timedelta(days=28),
        end_date=now - timedelta(days=14),
        goal="Initial foundation and requirements",
    )
    sprint2 = Sprint(
        id=UUID("20000000-0000-0000-0000-000000000002"),
        project_id=DEMO_PROJECT_ID,
        jira_sprint_id=2,
        name="Sprint 2",
        state="active",
        start_date=now - timedelta(days=13),
        end_date=now + timedelta(days=1),
        goal="Core services, integration and UAT",
    )
    for s in (sprint1, sprint2):
        target_store.sprints[s.id] = s

    # 4. Tasks (ALPHA-1 to ALPHA-8, mixed statuses: done, in_progress, blocked, todo)
    tasks = [
        Task(
            id=UUID("30000000-0000-0000-0000-000000000001"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-1",
            jira_issue_id="10001",
            title="Requirements Specification",
            description="Define functional requirements and architecture boundaries",
            status="done",
            status_category="Done",
            issue_type="Story",
            priority="High",
            story_points=3.0,
            estimate_hours=12.0,
            assignee_id=dev1.id,
            sprint_id=sprint1.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000002"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-2",
            jira_issue_id="10002",
            title="Use Cases & Architecture Design",
            description="Detailed workflow and service interaction design",
            status="done",
            status_category="Done",
            issue_type="Story",
            priority="High",
            story_points=4.0,
            estimate_hours=16.0,
            assignee_id=dev2.id,
            sprint_id=sprint1.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000003"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-3",
            jira_issue_id="10003",
            title="Database Schema Implementation",
            description="Create relational tables, triggers, indexes, and RLS policies",
            status="done",
            status_category="Done",
            issue_type="Task",
            priority="Highest",
            story_points=5.0,
            estimate_hours=20.0,
            assignee_id=dev3.id,
            sprint_id=sprint1.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000004"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-4",
            jira_issue_id="10004",
            title="UI Frontend Integration",
            description="Interactive graph visualizer and dashboard views",
            status="in_progress",
            status_category="In Progress",
            issue_type="Story",
            priority="Medium",
            story_points=6.0,
            estimate_hours=24.0,
            assignee_id=dev1.id,
            sprint_id=sprint2.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000005"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-5",
            jira_issue_id="10005",
            title="Payment Service Gateway",
            description="Stripe checkout and webhook processing pipeline",
            status="in_progress",
            status_category="In Progress",
            issue_type="Story",
            priority="High",
            story_points=5.0,
            estimate_hours=20.0,
            assignee_id=dev2.id,
            sprint_id=sprint2.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000006"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-6",
            jira_issue_id="10006",
            title="Localization & Multi-Language",
            description="i18n string dictionaries and locale negotiation",
            status="blocked",
            status_category="Blocked",
            issue_type="Story",
            priority="Low",
            story_points=3.0,
            estimate_hours=12.0,
            assignee_id=dev3.id,
            sprint_id=sprint2.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000007"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-7",
            jira_issue_id="10007",
            title="User Service & Authentication",
            description="JWT session handling and profile update endpoints",
            status="todo",
            status_category="To Do",
            issue_type="Story",
            priority="Medium",
            story_points=4.0,
            estimate_hours=16.0,
            assignee_id=dev2.id,
            sprint_id=sprint2.id,
        ),
        Task(
            id=UUID("30000000-0000-0000-0000-000000000008"),
            project_id=DEMO_PROJECT_ID,
            jira_issue_key="ALPHA-8",
            jira_issue_id="10008",
            title="Deploy to UAT Environment",
            description="Production-like container deployment and validation",
            status="todo",
            status_category="To Do",
            issue_type="Task",
            priority="High",
            story_points=2.0,
            estimate_hours=8.0,
            assignee_id=dev1.id,
            sprint_id=sprint2.id,
        ),
    ]
    for t in tasks:
        target_store.tasks[t.id] = t

    # 5. Dependency Edges (8 edges, tagged 'jira')
    task_map = {t.jira_issue_key: t.id for t in tasks}
    edge_pairs = [
        ("ALPHA-1", "ALPHA-2"),  # Requirements -> Use Cases
        ("ALPHA-2", "ALPHA-3"),  # Use Cases -> Data Schema
        ("ALPHA-3", "ALPHA-4"),  # Data Schema -> UI Frontend
        ("ALPHA-3", "ALPHA-5"),  # Data Schema -> Payment Service
        ("ALPHA-4", "ALPHA-6"),  # UI Frontend -> Localization
        ("ALPHA-5", "ALPHA-7"),  # Payment Service -> User Service
        ("ALPHA-6", "ALPHA-8"),  # Localization -> Deploy to UAT
        ("ALPHA-7", "ALPHA-8"),  # User Service -> Deploy to UAT
    ]

    edge_uuids = [
        UUID("40000000-0000-0000-0000-000000000001"),
        UUID("40000000-0000-0000-0000-000000000002"),
        UUID("40000000-0000-0000-0000-000000000003"),
        UUID("40000000-0000-0000-0000-000000000004"),
        UUID("40000000-0000-0000-0000-000000000005"),
        UUID("40000000-0000-0000-0000-000000000006"),
        UUID("40000000-0000-0000-0000-000000000007"),
        UUID("40000000-0000-0000-0000-000000000008"),
    ]

    for (src, dst), edge_id in zip(edge_pairs, edge_uuids):
        dep = Dependency(
            id=edge_id,
            project_id=DEMO_PROJECT_ID,
            from_task_id=task_map[src],
            to_task_id=task_map[dst],
            type="blocks",
            tag="jira",
            created_at=now,
        )
        target_store.dependencies[dep.id] = dep
