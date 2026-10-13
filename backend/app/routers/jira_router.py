"""FastAPI router for Jira integration endpoints."""

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
from app.schemas.jira import JiraHealthResponse, JiraStatusResponse, SyncSummary
from app.services.jira_integration import JiraClientProtocol, JiraIntegrationService

router = APIRouter(prefix="/jira", tags=["jira"])


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
) -> JiraStatusResponse:
    """Return the last synchronized timestamp and current entity counts for a project."""
    project = await project_repo.get_project(project_id)
    if not project:
        raise ProjectNotFoundError(f"Project with ID {project_id} not found")

    tasks = await task_repo.get_tasks(project_id)
    developers = await developer_repo.get_developers(project_id)
    sprints = await sprint_repo.get_sprints(project_id)
    dependencies = await dependency_repo.get_dependencies(project_id)

    return JiraStatusResponse(
        project_id=project_id,
        last_synced_at=project.last_synced_at,
        task_count=len(tasks),
        developer_count=len(developers),
        sprint_count=len(sprints),
        dependency_count=len(dependencies),
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
    if settings.JIRA_USE_MOCK:
        return JiraHealthResponse(connected=True, mock=True)

    await jira_client.ping()
    return JiraHealthResponse(connected=True, mock=False)
