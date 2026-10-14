"""Supabase implementation of DeveloperRepositoryProtocol."""

from typing import Optional
from uuid import UUID
from starlette.concurrency import run_in_threadpool

from app.core.errors import RepositoryError
from app.core.supabase_client import get_supabase
from app.repositories.base import DeveloperRepositoryProtocol
from app.schemas.domain import Developer


class SupabaseDeveloperRepository(DeveloperRepositoryProtocol):
    """Supabase-backed implementation of Developer repository."""

    def __init__(self) -> None:
        pass

    def _get_developers_sync(self, project_id: UUID) -> list[Developer]:
        try:
            client = get_supabase()
            res = client.table("developers").select("*").eq("project_id", str(project_id)).execute()
            return [Developer.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch developers: {exc}") from exc

    async def get_developers(self, project_id: UUID) -> list[Developer]:
        return await run_in_threadpool(self._get_developers_sync, project_id)

    def _get_developer_sync(self, developer_id: UUID) -> Optional[Developer]:
        try:
            client = get_supabase()
            res = client.table("developers").select("*").eq("id", str(developer_id)).execute()
            if not res.data:
                return None
            return Developer.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch developer: {exc}") from exc

    async def get_developer(self, developer_id: UUID) -> Optional[Developer]:
        return await run_in_threadpool(self._get_developer_sync, developer_id)

    def _upsert_developers_sync(self, developers: list[Developer]) -> list[Developer]:
        if not developers:
            return []
        try:
            client = get_supabase()
            payload = [d.model_dump(mode="json") for d in developers]
            res = (
                client.table("developers")
                .upsert(payload, on_conflict="project_id,jira_account_id")
                .execute()
            )
            return [Developer.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to upsert developers: {exc}") from exc

    async def upsert_developers(self, developers: list[Developer]) -> list[Developer]:
        return await run_in_threadpool(self._upsert_developers_sync, developers)

    def _delete_by_project_sync(self, project_id: UUID) -> int:
        try:
            client = get_supabase()
            res = client.table("developers").delete().eq("project_id", str(project_id)).execute()
            return len(res.data) if res.data else 0
        except Exception as exc:
            raise RepositoryError(f"Failed to delete developers: {exc}") from exc

    async def delete_by_project(self, project_id: UUID) -> int:
        return await run_in_threadpool(self._delete_by_project_sync, project_id)
