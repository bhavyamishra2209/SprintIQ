"""FastAPI router for Jira integration endpoints."""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, status

from app.core.config import Settings, get_settings
from app.core.errors import ProjectNotFoundError
from app.dependencies import (
    get_dependency_repository,
    get_developer_repository,
    get_jira_client,
    get_jira_service,
    get_project_repository,
    get_sprint_repository,
    get_task_repository,
)
from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.schemas.jira import (
    JiraConnectRequest,
    JiraHealthResponse,
    JiraStatusResponse,
    JiraTestConnectionRequest,
    SyncSummary,
)
from app.services.jira_integration import JiraClient, JiraClientProtocol, JiraIntegrationService

router = APIRouter(prefix="/jira", tags=["jira"])

# In-memory tracking of projects connected with live credentials
_live_connected_projects: set[UUID] = set()


@router.post(
    "/test-connection",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Test Jira Cloud credentials dynamically",
)
async def test_jira_connection(req: JiraTestConnectionRequest) -> dict[str, Any]:
    """Test credentials against Jira Cloud /rest/api/3/myself."""
    client = JiraClient(
        base_url=req.jira_base_url,
        email=req.jira_email,
        api_token=req.jira_api_token,
    )
    try:
        user_info = await client.ping()
        return {
            "connected": True,
            "display_name": user_info.get("displayName"),
            "email": user_info.get("emailAddress"),
        }
    finally:
        await client.close()


@router.post(
    "/projects/{project_id}/connect",
    response_model=SyncSummary,
    status_code=status.HTTP_200_OK,
    summary="Dynamically configure and synchronize project with real Jira credentials",
)
async def connect_and_sync_project(
    project_id: UUID,
    req: JiraConnectRequest,
    project_repo: ProjectRepositoryProtocol = Depends(get_project_repository),
    task_repo: TaskRepositoryProtocol = Depends(get_task_repository),
    developer_repo: DeveloperRepositoryProtocol = Depends(get_developer_repository),
    sprint_repo: SprintRepositoryProtocol = Depends(get_sprint_repository),
    dependency_repo: DependencyRepositoryProtocol = Depends(get_dependency_repository),
    settings: Settings = Depends(get_settings),
) -> SyncSummary:
    """Connect project to Jira Cloud dynamically, update project metadata, and trigger live sync."""
    project = await project_repo.get_project(project_id)
    if not project:
        raise ProjectNotFoundError(f"Project with ID {project_id} not found")

    # Clear previous sample or stale entities for this project
    await dependency_repo.delete_by_project(project_id)
    await task_repo.delete_by_project(project_id)
    await sprint_repo.delete_by_project(project_id)
    await developer_repo.delete_by_project(project_id)

    # Update project Jira settings
    project.jira_project_key = req.jira_project_key.strip()
    if req.jira_board_id is not None:
        project.jira_board_id = req.jira_board_id
    if req.project_name:
        project.name = req.project_name.strip()
    await project_repo.upsert_project(project)

    # Initialize live client with provided credentials
    client = JiraClient(
        base_url=req.jira_base_url,
        email=req.jira_email,
        api_token=req.jira_api_token,
    )
    try:
        service = JiraIntegrationService(
            client=client,
            project_repo=project_repo,
            sprint_repo=sprint_repo,
            developer_repo=developer_repo,
            task_repo=task_repo,
            dependency_repo=dependency_repo,
            settings=settings,
        )
        summary = await service.sync_project(project_id)
        _live_connected_projects.add(project_id)
        return summary
    finally:
        await client.close()


@router.post(
    "/projects/{project_id}/sync",
    response_model=SyncSummary,
    status_code=status.HTTP_200_OK,
    summary="Synchronize project with Jira",
)
async def sync_project(
    project_id: UUID,
    jira_service: JiraIntegrationService = Depends(get_jira_service),
) -> SyncSummary:
    """Synchronize sprints, assignable users, issues, and dependency edges from Jira."""
    return await jira_service.sync_project(project_id)


@router.get(
    "/projects/{project_id}/status",
    response_model=JiraStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve sync status and entity counts for a project",
)
async def get_sync_status(
    project_id: UUID,
    project_repo: ProjectRepositoryProtocol = Depends(get_project_repository),
    task_repo: TaskRepositoryProtocol = Depends(get_task_repository),
    developer_repo: DeveloperRepositoryProtocol = Depends(get_developer_repository),
    sprint_repo: SprintRepositoryProtocol = Depends(get_sprint_repository),
    dependency_repo: DependencyRepositoryProtocol = Depends(get_dependency_repository),
    settings: Settings = Depends(get_settings),
) -> JiraStatusResponse:
    """Return the last synchronized timestamp and current entity counts for a project."""
    project = await project_repo.get_project(project_id)
    if not project:
        raise ProjectNotFoundError(f"Project with ID {project_id} not found")

    tasks = await task_repo.get_tasks(project_id)
    developers = await developer_repo.get_developers(project_id)
    sprints = await sprint_repo.get_sprints(project_id)
    dependencies = await dependency_repo.get_dependencies(project_id)

    is_live = project_id in _live_connected_projects or not settings.JIRA_USE_MOCK

    return JiraStatusResponse(
        project_id=project_id,
        last_synced_at=project.last_synced_at,
        task_count=len(tasks),
        developer_count=len(developers),
        sprint_count=len(sprints),
        dependency_count=len(dependencies),
        jira_project_key=project.jira_project_key,
        is_live_connected=is_live,
    )


@router.get(
    "/health",
    response_model=JiraHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Check Jira connection health",
)
async def jira_health(
    jira_client: JiraClientProtocol = Depends(get_jira_client),
    settings: Settings = Depends(get_settings),
) -> JiraHealthResponse:
    """Check whether Jira connectivity is operational (or mock mode active)."""
    if _live_connected_projects:
        return JiraHealthResponse(connected=True, mock=False)

    if settings.JIRA_USE_MOCK:
        return JiraHealthResponse(connected=True, mock=True)

    await jira_client.ping()
    return JiraHealthResponse(connected=True, mock=False)
