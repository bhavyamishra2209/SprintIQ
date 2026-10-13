"""Tests for In-Memory and Supabase repository implementations."""

from unittest.mock import MagicMock
from uuid import UUID, uuid4
import pytest

from app.core.config import Settings
from app.core.errors import RepositoryError
from app.repositories import base
from app.repositories.demo_seed import DEMO_PROJECT_ID, seed_demo_data
from app.repositories.dependency_repository import SupabaseDependencyRepository
from app.repositories.developer_repository import SupabaseDeveloperRepository
from app.repositories.in_memory import (
    InMemoryDependencyRepository,
    InMemoryDeveloperRepository,
    InMemoryProjectRepository,
    InMemorySprintRepository,
    InMemoryStore,
    InMemoryTaskRepository,
)
from app.repositories.project_repository import SupabaseProjectRepository
from app.repositories.sprint_repository import SupabaseSprintRepository
from app.repositories.task_repository import SupabaseTaskRepository
from app.schemas.domain import Dependency, Developer, Project, Sprint, Task


@pytest.mark.asyncio
async def test_in_memory_task_repository_upsert_and_retrieve():
    store = InMemoryStore()
    repo = InMemoryTaskRepository(store)
    project_id = uuid4()

    task1 = Task(
        project_id=project_id,
        jira_issue_key="ALPHA-1",
        title="Initial Task",
        status="todo",
        estimate_hours=10.0,
    )

    upserted = await repo.upsert_tasks([task1])
    assert len(upserted) == 1
    assert upserted[0].jira_issue_key == "ALPHA-1"

    # Upsert again with changed status and title
    task1_updated = Task(
        project_id=project_id,
        jira_issue_key="ALPHA-1",
        title="Updated Task Title",
        status="in_progress",
        estimate_hours=12.0,
    )
    upserted_again = await repo.upsert_tasks([task1_updated])
    assert len(upserted_again) == 1
    # Preserves original ID
    assert upserted_again[0].id == task1.id
    assert upserted_again[0].title == "Updated Task Title"
    assert upserted_again[0].status == "in_progress"
    assert upserted_again[0].estimate_hours == 12.0

    # Retrieve all tasks for project
    all_tasks = await repo.get_tasks(project_id)
    assert len(all_tasks) == 1
    assert all_tasks[0].id == task1.id


@pytest.mark.asyncio
async def test_in_memory_dependency_repository_replace():
    store = InMemoryStore()
    repo = InMemoryDependencyRepository(store)
    project_id = uuid4()

    t1, t2, t3 = uuid4(), uuid4(), uuid4()

    dep1 = Dependency(project_id=project_id, from_task_id=t1, to_task_id=t2, tag="jira")
    dep2 = Dependency(project_id=project_id, from_task_id=t2, to_task_id=t3, tag="jira")

    await repo.replace_dependencies(project_id, [dep1, dep2], tag_filter="jira")
    current = await repo.get_dependencies(project_id)
    assert len(current) == 2

    # Replace with only 1 dependency
    dep3 = Dependency(project_id=project_id, from_task_id=t1, to_task_id=t3, tag="jira")
    await repo.replace_dependencies(project_id, [dep3], tag_filter="jira")

    current_after = await repo.get_dependencies(project_id)
    assert len(current_after) == 1
    assert current_after[0].id == dep3.id


@pytest.mark.asyncio
async def test_in_memory_developer_and_sprint_parity():
    store = InMemoryStore()
    dev_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    project_id = uuid4()

    dev = Developer(
        project_id=project_id,
        jira_account_id="acc-1",
        display_name="Dev One",
        email="dev1@example.com",
    )
    upserted_devs = await dev_repo.upsert_developers([dev])
    assert len(upserted_devs) == 1

    sprint = Sprint(
        project_id=project_id,
        jira_sprint_id=10,
        name="Sprint 10",
        state="active",
    )
    upserted_sprints = await sprint_repo.upsert_sprints([sprint])
    assert len(upserted_sprints) == 1

    fetched_devs = await dev_repo.get_developers(project_id)
    assert len(fetched_devs) == 1
    assert fetched_devs[0].jira_account_id == "acc-1"

    fetched_sprints = await sprint_repo.get_sprints(project_id)
    assert len(fetched_sprints) == 1
    assert fetched_sprints[0].jira_sprint_id == 10


@pytest.mark.asyncio
async def test_supabase_task_repository_mapping_with_stub(monkeypatch):
    task_id = str(uuid4())
    proj_id = str(uuid4())
    fake_row = {
        "id": task_id,
        "project_id": proj_id,
        "jira_issue_key": "ALPHA-1",
        "jira_issue_id": "1001",
        "title": "Stubbed Task",
        "description": "Description",
        "status": "todo",
        "status_category": "To Do",
        "issue_type": "Story",
        "priority": "Medium",
        "story_points": 3.0,
        "estimate_hours": 12.0,
        "assignee_id": None,
        "sprint_id": None,
        "due_date": None,
        "jira_created_at": None,
        "jira_updated_at": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_res = MagicMock()
    mock_res.data = [fake_row]

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_res

    monkeypatch.setattr("app.repositories.task_repository.get_supabase", lambda: mock_client)

    repo = SupabaseTaskRepository()
    tasks = await repo.get_tasks(UUID(proj_id))

    assert len(tasks) == 1
    assert isinstance(tasks[0], Task)
    assert str(tasks[0].id) == task_id
    assert tasks[0].jira_issue_key == "ALPHA-1"


@pytest.mark.asyncio
async def test_supabase_repository_error_handling(monkeypatch):
    mock_client = MagicMock()
    mock_client.table.side_effect = RuntimeError("DB connection error")

    monkeypatch.setattr("app.repositories.task_repository.get_supabase", lambda: mock_client)

    repo = SupabaseTaskRepository()
    with pytest.raises(RepositoryError) as exc_info:
        await repo.get_tasks(uuid4())
    assert "Failed to fetch tasks" in str(exc_info.value)


@pytest.mark.asyncio
async def test_seed_demo_data_enabled_with_custom_keys():
    store = InMemoryStore()
    settings = Settings(
        STORAGE_BACKEND="memory",
        SEED_DEMO_DATA=True,
        JIRA_PROJECT_KEY="CUSTOMKEY",
        JIRA_BOARD_ID=404,
    )
    await seed_demo_data(store=store, settings=settings)

    assert DEMO_PROJECT_ID in store.projects
    proj = store.projects[DEMO_PROJECT_ID]
    assert proj.jira_project_key == "CUSTOMKEY"
    assert proj.jira_board_id == 404
    assert len(store.tasks) == 8
    assert len(store.developers) == 3
    assert len(store.sprints) == 2
    assert len(store.dependencies) == 8


@pytest.mark.asyncio
async def test_seed_demo_data_disabled():
    store = InMemoryStore()
    settings = Settings(
        STORAGE_BACKEND="memory",
        SEED_DEMO_DATA=False,
        JIRA_PROJECT_KEY="EMPTYPROJ",
        JIRA_BOARD_ID=500,
    )
    await seed_demo_data(store=store, settings=settings)

    assert DEMO_PROJECT_ID in store.projects
    proj = store.projects[DEMO_PROJECT_ID]
    assert proj.jira_project_key == "EMPTYPROJ"
    assert proj.jira_board_id == 500
    # No tasks, developers, sprints or dependencies should be seeded
    assert len(store.tasks) == 0
    assert len(store.developers) == 0
    assert len(store.sprints) == 0
    assert len(store.dependencies) == 0

