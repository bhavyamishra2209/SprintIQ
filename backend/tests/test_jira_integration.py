"""Unit and integration tests for Jira client, mapper, and synchronization service."""

from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4
import httpx
import pytest

from app.core.config import Settings
from app.core.errors import JiraAuthError, JiraError, JiraNotFoundError
from app.repositories.in_memory import (
    InMemoryDependencyRepository,
    InMemoryDeveloperRepository,
    InMemoryProjectRepository,
    InMemorySprintRepository,
    InMemoryStore,
    InMemoryTaskRepository,
)
from app.schemas.domain import Project
from app.services.jira_integration import (
    JiraClient,
    JiraIntegrationService,
    MockJiraClient,
    adf_to_text,
)


def test_adf_to_text_flattening():
    # 1. Plain string or None
    assert adf_to_text(None) is None
    assert adf_to_text("") is None
    assert adf_to_text("   ") is None
    assert adf_to_text("Simple text") == "Simple text"

    # 2. Rich ADF structure
    adf = {
        "version": 1,
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "First line."},
                    {"type": "text", "text": " More text here."},
                ],
            },
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Item 1"}]}
                        ],
                    }
                ],
            },
        ],
    }
    flattened = adf_to_text(adf)
    assert "First line." in flattened
    assert "More text here." in flattened
    assert "Item 1" in flattened


@pytest.mark.asyncio
async def test_jira_integration_service_sync_and_idempotency():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    project = Project(
        id=project_id,
        name="Project Alpha",
        jira_project_key="ALPHA",
        jira_board_id=101,
    )
    await project_repo.upsert_project(project)

    mock_client = MockJiraClient()
    settings = Settings(
        STORAGE_BACKEND="memory",
        JIRA_USE_MOCK=True,
        JIRA_HOURS_PER_STORY_POINT=4.0,
    )

    service = JiraIntegrationService(
        client=mock_client,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        settings=settings,
    )

    # First sync
    summary1 = await service.sync_project(project_id)
    assert summary1.synced_tasks == 8
    assert summary1.synced_sprints == 2
    assert summary1.synced_developers == 3
    assert summary1.synced_dependencies == 8

    # Verify tasks and statuses
    tasks = await task_repo.get_tasks(project_id)
    assert len(tasks) == 8
    task_map = {t.jira_issue_key: t for t in tasks}

    # ALPHA-1 is Done (done category)
    assert task_map["ALPHA-1"].status == "done"
    # ALPHA-4 is In Progress (indeterminate category)
    assert task_map["ALPHA-4"].status == "in_progress"
    # ALPHA-6 status name is "Blocked By External Team" -> should map to blocked
    assert task_map["ALPHA-6"].status == "blocked"
    # ALPHA-7 is To Do (new category)
    assert task_map["ALPHA-7"].status == "todo"

    # Verify estimate hours fallback
    assert task_map["ALPHA-1"].estimate_hours == 12.0  # 43200s / 3600

    # Verify dependencies
    deps = await dependency_repo.get_dependencies(project_id)
    assert len(deps) == 8
    # ALPHA-1 blocks ALPHA-2 -> from ALPHA-1 to ALPHA-2
    alpha1_id = task_map["ALPHA-1"].id
    alpha2_id = task_map["ALPHA-2"].id
    matching_dep = [d for d in deps if d.from_task_id == alpha1_id and d.to_task_id == alpha2_id]
    assert len(matching_dep) == 1

    # Second sync: MUST BE IDEMPOTENT (no duplicates created)
    summary2 = await service.sync_project(project_id)
    assert summary2.synced_tasks == 8
    assert summary2.synced_dependencies == 8

    tasks_after = await task_repo.get_tasks(project_id)
    assert len(tasks_after) == 8
    deps_after = await dependency_repo.get_dependencies(project_id)
    assert len(deps_after) == 8


@pytest.mark.asyncio
async def test_jira_links_depends_direction_and_warning():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    project = Project(
        id=project_id,
        name="Project Beta",
        jira_project_key="BETA",
    )
    await project_repo.upsert_project(project)

    # Custom mock returning 2 issues: BETA-1 and BETA-2
    # BETA-2 has "Depends" outward link to BETA-1 (BETA-1 must finish before BETA-2 can start)
    # Plus BETA-2 has a link to an external issue EXT-999
    # Plus a self link on BETA-1
    fake_client = MagicMock()
    fake_client.get_project_users = AsyncMock(return_value=[])
    fake_client.search_issues = AsyncMock(
        return_value=[
            {
                "id": "1",
                "key": "BETA-1",
                "fields": {
                    "summary": "Task 1",
                    "status": {"name": "To Do", "statusCategory": {"key": "new"}},
                    "issuelinks": [
                        {
                            "type": {"name": "Blocks"},
                            "outwardIssue": {"key": "BETA-1"},  # Self link to skip
                        }
                    ],
                },
            },
            {
                "id": "2",
                "key": "BETA-2",
                "fields": {
                    "summary": "Task 2",
                    "status": {"name": "To Do", "statusCategory": {"key": "new"}},
                    "issuelinks": [
                        {
                            "type": {"name": "Depends", "outward": "depends on"},
                            "outwardIssue": {"key": "BETA-1"},  # BETA-1 must finish before BETA-2
                        },
                        {
                            "type": {"name": "Blocks"},
                            "outwardIssue": {"key": "EXT-999"},  # Unknown external issue
                        },
                    ],
                },
            },
        ]
    )

    service = JiraIntegrationService(
        client=fake_client,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        settings=Settings(STORAGE_BACKEND="memory", JIRA_USE_MOCK=True),
    )

    summary = await service.sync_project(project_id)
    assert summary.synced_tasks == 2
    assert summary.synced_dependencies == 1
    # Check warning on unknown issue
    assert any("EXT-999" in w for w in summary.warnings)

    deps = await dependency_repo.get_dependencies(project_id)
    tasks = await task_repo.get_tasks(project_id)
    t_map = {t.jira_issue_key: t.id for t in tasks}

    # BETA-1 is from_task, BETA-2 is to_task
    assert deps[0].from_task_id == t_map["BETA-1"]
    assert deps[0].to_task_id == t_map["BETA-2"]


@pytest.mark.asyncio
async def test_jira_client_retry_on_429():
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(
                429, headers={"Retry-After": "0"}, text="Rate limited"
            )
        return httpx.Response(
            200, json={"accountId": "success-id", "displayName": "Success User"}
        )

    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient(transport=transport, base_url="https://jira.example.com")

    client = JiraClient(
        base_url="https://jira.example.com",
        email="test@example.com",
        api_token="token",
        http_client=async_client,
        max_retries=3,
    )

    result = await client.ping()
    assert result["accountId"] == "success-id"
    assert call_count == 2
