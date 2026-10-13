"""Dependency injection providers for repositories and domain services."""

from functools import lru_cache
from typing import Optional
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.repositories.dependency_repository import SupabaseDependencyRepository
from app.repositories.developer_repository import SupabaseDeveloperRepository
from app.repositories.in_memory import (
    InMemoryDependencyRepository,
    InMemoryDeveloperRepository,
    InMemoryProjectRepository,
    InMemorySprintRepository,
    InMemoryStore,
    InMemoryTaskRepository,
    get_in_memory_store,
)
from app.repositories.project_repository import SupabaseProjectRepository
from app.repositories.sprint_repository import SupabaseSprintRepository
from app.repositories.task_repository import SupabaseTaskRepository
from app.services.jira_integration import (
    JiraClient,
    JiraClientProtocol,
    JiraIntegrationService,
    MockJiraClient,
)


def get_project_repository(
    settings: Settings = Depends(get_settings),
) -> ProjectRepositoryProtocol:
    """Return Project repository instance based on STORAGE_BACKEND setting."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseProjectRepository()
    return InMemoryProjectRepository()


def get_developer_repository(
    settings: Settings = Depends(get_settings),
) -> DeveloperRepositoryProtocol:
    """Return Developer repository instance based on STORAGE_BACKEND setting."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseDeveloperRepository()
    return InMemoryDeveloperRepository()


def get_sprint_repository(
    settings: Settings = Depends(get_settings),
) -> SprintRepositoryProtocol:
    """Return Sprint repository instance based on STORAGE_BACKEND setting."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseSprintRepository()
    return InMemorySprintRepository()


def get_task_repository(
    settings: Settings = Depends(get_settings),
) -> TaskRepositoryProtocol:
    """Return Task repository instance based on STORAGE_BACKEND setting."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseTaskRepository()
    return InMemoryTaskRepository()


def get_dependency_repository(
    settings: Settings = Depends(get_settings),
) -> DependencyRepositoryProtocol:
    """Return Dependency repository instance based on STORAGE_BACKEND setting."""
    if settings.STORAGE_BACKEND == "supabase":
        return SupabaseDependencyRepository()
    return InMemoryDependencyRepository()


def get_jira_client(
    settings: Settings = Depends(get_settings),
) -> JiraClientProtocol:
    """Return MockJiraClient or real JiraClient based on JIRA_USE_MOCK setting."""
    if settings.JIRA_USE_MOCK:
        return MockJiraClient()
    return JiraClient()


def get_jira_service(
    client: JiraClientProtocol = Depends(get_jira_client),
    project_repo: ProjectRepositoryProtocol = Depends(get_project_repository),
    developer_repo: DeveloperRepositoryProtocol = Depends(get_developer_repository),
    sprint_repo: SprintRepositoryProtocol = Depends(get_sprint_repository),
    task_repo: TaskRepositoryProtocol = Depends(get_task_repository),
    dependency_repo: DependencyRepositoryProtocol = Depends(get_dependency_repository),
    settings: Settings = Depends(get_settings),
) -> JiraIntegrationService:
    """Return JiraIntegrationService with injected repositories and HTTP client."""
    return JiraIntegrationService(
        client=client,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        settings=settings,
    )
