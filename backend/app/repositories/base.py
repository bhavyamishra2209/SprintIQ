"""Repository protocols and interfaces for SprintIQ data access.

All repositories adhere to these protocols, allowing in-memory and Supabase
implementations to be swapped without changing service or router code.
"""

from datetime import datetime
from typing import Optional, Protocol, runtime_checkable
from uuid import UUID

from app.schemas.domain import Developer, Dependency, Project, Sprint, Task


@runtime_checkable
class ProjectRepositoryProtocol(Protocol):
    """Protocol for Project persistence."""

    async def get_project(self, project_id: UUID) -> Optional[Project]:
        """Retrieve project by ID."""
        ...

    async def get_project_by_key(self, jira_project_key: str) -> Optional[Project]:
        """Retrieve project by Jira project key."""
        ...

    async def upsert_project(self, project: Project) -> Project:
        """Upsert a project record."""
        ...

    async def update_last_synced_at(self, project_id: UUID, last_synced_at: datetime) -> None:
        """Update project's last_synced_at timestamp."""
        ...


@runtime_checkable
class DeveloperRepositoryProtocol(Protocol):
    """Protocol for Developer persistence."""

    async def get_developers(self, project_id: UUID) -> list[Developer]:
        """Retrieve all developers for a project."""
        ...

    async def get_developer(self, developer_id: UUID) -> Optional[Developer]:
        """Retrieve developer by ID."""
        ...

    async def upsert_developers(self, developers: list[Developer]) -> list[Developer]:
        """Upsert a list of developers, resolving on (project_id, jira_account_id)."""
        ...

    async def delete_by_project(self, project_id: UUID) -> int:
        """Delete all developers belonging to a project."""
        ...


@runtime_checkable
class SprintRepositoryProtocol(Protocol):
    """Protocol for Sprint persistence."""

    async def get_sprints(self, project_id: UUID) -> list[Sprint]:
        """Retrieve all sprints for a project."""
        ...

    async def get_sprint(self, sprint_id: UUID) -> Optional[Sprint]:
        """Retrieve sprint by ID."""
        ...

    async def upsert_sprints(self, sprints: list[Sprint]) -> list[Sprint]:
        """Upsert a list of sprints, resolving on (project_id, jira_sprint_id)."""
        ...

    async def delete_by_project(self, project_id: UUID) -> int:
        """Delete all sprints belonging to a project."""
        ...


@runtime_checkable
class TaskRepositoryProtocol(Protocol):
    """Protocol for Task persistence."""

    async def get_tasks(self, project_id: UUID) -> list[Task]:
        """Retrieve all tasks for a project."""
        ...

    async def get_task(self, task_id: UUID) -> Optional[Task]:
        """Retrieve a task by ID."""
        ...

    async def upsert_tasks(self, tasks: list[Task]) -> list[Task]:
        """Upsert a list of tasks, resolving on (project_id, jira_issue_key)."""
        ...

    async def delete_by_project(self, project_id: UUID) -> int:
        """Delete all tasks belonging to a project."""
        ...


@runtime_checkable
class DependencyRepositoryProtocol(Protocol):
    """Protocol for Dependency persistence."""

    async def get_dependencies(self, project_id: UUID) -> list[Dependency]:
        """Retrieve all dependency edges for a project."""
        ...

    async def replace_dependencies(
        self,
        project_id: UUID,
        dependencies: list[Dependency],
        tag_filter: Optional[str] = "jira",
    ) -> list[Dependency]:
        """Replace project dependencies matching tag_filter with the provided list."""
        ...

    async def delete_by_project(self, project_id: UUID) -> int:
        """Delete all dependencies belonging to a project."""
        ...
