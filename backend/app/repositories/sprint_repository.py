"""Supabase implementation of SprintRepositoryProtocol."""

from typing import Optional
from uuid import UUID
from starlette.concurrency import run_in_threadpool

from app.core.errors import RepositoryError
from app.core.supabase_client import get_supabase
from app.repositories.base import SprintRepositoryProtocol
from app.schemas.domain import Sprint


class SupabaseSprintRepository(SprintRepositoryProtocol):
    """Supabase-backed implementation of Sprint repository."""

    def __init__(self) -> None:
        pass

    def _get_sprints_sync(self, project_id: UUID) -> list[Sprint]:
        try:
            client = get_supabase()
            res = client.table("sprints").select("*").eq("project_id", str(project_id)).execute()
            return [Sprint.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch sprints: {exc}") from exc

    async def get_sprints(self, project_id: UUID) -> list[Sprint]:
        return await run_in_threadpool(self._get_sprints_sync, project_id)

    def _get_sprint_sync(self, sprint_id: UUID) -> Optional[Sprint]:
        try:
            client = get_supabase()
            res = client.table("sprints").select("*").eq("id", str(sprint_id)).execute()
            if not res.data:
                return None
            return Sprint.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch sprint: {exc}") from exc

    async def get_sprint(self, sprint_id: UUID) -> Optional[Sprint]:
        return await run_in_threadpool(self._get_sprint_sync, sprint_id)

    def _upsert_sprints_sync(self, sprints: list[Sprint]) -> list[Sprint]:
        if not sprints:
            return []
        try:
            client = get_supabase()
            payload = [s.model_dump(mode="json") for s in sprints]
            res = (
                client.table("sprints")
                .upsert(payload, on_conflict="project_id,jira_sprint_id")
                .execute()
            )
            return [Sprint.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to upsert sprints: {exc}") from exc

    async def upsert_sprints(self, sprints: list[Sprint]) -> list[Sprint]:
        return await run_in_threadpool(self._upsert_sprints_sync, sprints)

    def _delete_by_project_sync(self, project_id: UUID) -> int:
        try:
            client = get_supabase()
            res = client.table("sprints").delete().eq("project_id", str(project_id)).execute()
            return len(res.data) if res.data else 0
        except Exception as exc:
            raise RepositoryError(f"Failed to delete sprints: {exc}") from exc

    async def delete_by_project(self, project_id: UUID) -> int:
        return await run_in_threadpool(self._delete_by_project_sync, project_id)
