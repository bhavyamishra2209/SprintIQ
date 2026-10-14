"""In-memory store and repository implementations.

This is the default storage backend for SprintIQ, enabling zero-config
startup, local development, and fast, isolated testing without Supabase.
"""

from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional
from uuid import UUID

from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.schemas.domain import Dependency, Developer, Project, Sprint, Task


class InMemoryStore:
    """Thread-safe in-memory entity store."""

    def __init__(self) -> None:
        self.projects: dict[UUID, Project] = {}
        self.developers: dict[UUID, Developer] = {}
        self.sprints: dict[UUID, Sprint] = {}
        self.tasks: dict[UUID, Task] = {}
        self.dependencies: dict[UUID, Dependency] = {}

    def clear(self) -> None:
        """Clear all store contents (useful between tests)."""
        self.projects.clear()
        self.developers.clear()
        self.sprints.clear()
        self.tasks.clear()
        self.dependencies.clear()


@lru_cache()
def get_in_memory_store() -> InMemoryStore:
    """Return the singleton InMemoryStore instance."""
    return InMemoryStore()


class InMemoryProjectRepository(ProjectRepositoryProtocol):
    """In-memory implementation of ProjectRepositoryProtocol."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self._store = store or get_in_memory_store()

    async def get_project(self, project_id: UUID) -> Optional[Project]:
        return self._store.projects.get(project_id)

    async def get_project_by_key(self, jira_project_key: str) -> Optional[Project]:
        for project in self._store.projects.values():
            if project.jira_project_key == jira_project_key:
                return project
        return None

    async def upsert_project(self, project: Project) -> Project:
        # Match by ID or jira_project_key
        existing_id = None
        for pid, p in self._store.projects.items():
            if pid == project.id or (
                project.jira_project_key and p.jira_project_key == project.jira_project_key
            ):
                existing_id = pid
                break

        now = datetime.now(timezone.utc)
        if existing_id:
            old = self._store.projects[existing_id]
            updated = project.model_copy(
                update={"id": existing_id, "created_at": old.created_at, "updated_at": now}
            )
            self._store.projects[existing_id] = updated
            return updated

        self._store.projects[project.id] = project
        return project

    async def update_last_synced_at(self, project_id: UUID, last_synced_at: datetime) -> None:
        if project_id in self._store.projects:
            proj = self._store.projects[project_id]
            self._store.projects[project_id] = proj.model_copy(
                update={"last_synced_at": last_synced_at, "updated_at": datetime.now(timezone.utc)}
            )


class InMemoryDeveloperRepository(DeveloperRepositoryProtocol):
    """In-memory implementation of DeveloperRepositoryProtocol."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self._store = store or get_in_memory_store()

    async def get_developers(self, project_id: UUID) -> list[Developer]:
        return [
            dev for dev in self._store.developers.values() if dev.project_id == project_id
        ]

    async def get_developer(self, developer_id: UUID) -> Optional[Developer]:
        return self._store.developers.get(developer_id)

    async def upsert_developers(self, developers: list[Developer]) -> list[Developer]:
        results: list[Developer] = []
        now = datetime.now(timezone.utc)
        for dev in developers:
            existing_id = None
            for did, d in self._store.developers.items():
                if d.project_id == dev.project_id and (
                    did == dev.id
                    or (dev.jira_account_id and d.jira_account_id == dev.jira_account_id)
                ):
                    existing_id = did
                    break

            if existing_id:
                old = self._store.developers[existing_id]
                updated = dev.model_copy(
                    update={"id": existing_id, "created_at": old.created_at, "updated_at": now}
                )
                self._store.developers[existing_id] = updated
                results.append(updated)
            else:
                self._store.developers[dev.id] = dev
                results.append(dev)
        return results

    async def delete_by_project(self, project_id: UUID) -> int:
        to_delete = [
            did for did, d in self._store.developers.items() if d.project_id == project_id
        ]
        for did in to_delete:
            del self._store.developers[did]
        return len(to_delete)


class InMemorySprintRepository(SprintRepositoryProtocol):
    """In-memory implementation of SprintRepositoryProtocol."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self._store = store or get_in_memory_store()

    async def get_sprints(self, project_id: UUID) -> list[Sprint]:
        return [
            sprint for sprint in self._store.sprints.values() if sprint.project_id == project_id
        ]

    async def get_sprint(self, sprint_id: UUID) -> Optional[Sprint]:
        return self._store.sprints.get(sprint_id)

    async def upsert_sprints(self, sprints: list[Sprint]) -> list[Sprint]:
        results: list[Sprint] = []
        now = datetime.now(timezone.utc)
        for sprint in sprints:
            existing_id = None
            for sid, s in self._store.sprints.items():
                if s.project_id == sprint.project_id and (
                    sid == sprint.id
                    or (sprint.jira_sprint_id and s.jira_sprint_id == sprint.jira_sprint_id)
                ):
                    existing_id = sid
                    break

            if existing_id:
                old = self._store.sprints[existing_id]
                updated = sprint.model_copy(
                    update={"id": existing_id, "created_at": old.created_at, "updated_at": now}
                )
                self._store.sprints[existing_id] = updated
                results.append(updated)
            else:
                self._store.sprints[sprint.id] = sprint
                results.append(sprint)
        return results

    async def delete_by_project(self, project_id: UUID) -> int:
        to_delete = [
            sid for sid, s in self._store.sprints.items() if s.project_id == project_id
        ]
        for sid in to_delete:
            del self._store.sprints[sid]
        return len(to_delete)


class InMemoryTaskRepository(TaskRepositoryProtocol):
    """In-memory implementation of TaskRepositoryProtocol."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self._store = store or get_in_memory_store()

    async def get_tasks(self, project_id: UUID) -> list[Task]:
        return [
            task for task in self._store.tasks.values() if task.project_id == project_id
        ]

    async def get_task(self, task_id: UUID) -> Optional[Task]:
        return self._store.tasks.get(task_id)

    async def upsert_tasks(self, tasks: list[Task]) -> list[Task]:
        results: list[Task] = []
        now = datetime.now(timezone.utc)
        for task in tasks:
            existing_id = None
            for tid, t in self._store.tasks.items():
                if t.project_id == task.project_id and (
                    tid == task.id
                    or (task.jira_issue_key and t.jira_issue_key == task.jira_issue_key)
                ):
                    existing_id = tid
                    break

            if existing_id:
                old = self._store.tasks[existing_id]
                updated = task.model_copy(
                    update={"id": existing_id, "created_at": old.created_at, "updated_at": now}
                )
                self._store.tasks[existing_id] = updated
                results.append(updated)
            else:
                self._store.tasks[task.id] = task
                results.append(task)
        return results

    async def delete_by_project(self, project_id: UUID) -> int:
        to_delete = [
            tid for tid, t in self._store.tasks.items() if t.project_id == project_id
        ]
        for tid in to_delete:
            del self._store.tasks[tid]
        return len(to_delete)


class InMemoryDependencyRepository(DependencyRepositoryProtocol):
    """In-memory implementation of DependencyRepositoryProtocol."""

    def __init__(self, store: Optional[InMemoryStore] = None) -> None:
        self._store = store or get_in_memory_store()

    async def get_dependencies(self, project_id: UUID) -> list[Dependency]:
        return [
            dep for dep in self._store.dependencies.values() if dep.project_id == project_id
        ]

    async def replace_dependencies(
        self,
        project_id: UUID,
        dependencies: list[Dependency],
        tag_filter: Optional[str] = "jira",
    ) -> list[Dependency]:
        # Delete existing dependencies matching project and tag_filter
        to_delete = [
            did
            for did, dep in self._store.dependencies.items()
            if dep.project_id == project_id
            and (tag_filter is None or dep.tag == tag_filter)
        ]
        for did in to_delete:
            del self._store.dependencies[did]

        # Insert new dependencies
        for dep in dependencies:
            self._store.dependencies[dep.id] = dep

        return dependencies

    async def delete_by_project(self, project_id: UUID) -> int:
        to_delete = [
            did
            for did, dep in self._store.dependencies.items()
            if dep.project_id == project_id
        ]
        for did in to_delete:
            del self._store.dependencies[did]
        return len(to_delete)
