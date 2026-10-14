"""Supabase implementation of DependencyRepositoryProtocol."""

from typing import Optional
from uuid import UUID
from starlette.concurrency import run_in_threadpool

from app.core.errors import RepositoryError
from app.core.supabase_client import get_supabase
from app.repositories.base import DependencyRepositoryProtocol
from app.schemas.domain import Dependency


class SupabaseDependencyRepository(DependencyRepositoryProtocol):
    """Supabase-backed implementation of Dependency repository."""

    def __init__(self) -> None:
        pass

    def _get_dependencies_sync(self, project_id: UUID) -> list[Dependency]:
        try:
            client = get_supabase()
            res = (
                client.table("dependencies")
                .select("*")
                .eq("project_id", str(project_id))
                .execute()
            )
            return [Dependency.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch dependencies: {exc}") from exc

    async def get_dependencies(self, project_id: UUID) -> list[Dependency]:
        return await run_in_threadpool(self._get_dependencies_sync, project_id)

    def _replace_dependencies_sync(
        self,
        project_id: UUID,
        dependencies: list[Dependency],
        tag_filter: Optional[str] = "jira",
    ) -> list[Dependency]:
        try:
            client = get_supabase()
            # 1. Delete matching dependencies
            query = client.table("dependencies").delete().eq("project_id", str(project_id))
            if tag_filter is not None:
                query = query.eq("tag", tag_filter)
            query.execute()

            # 2. Insert new dependencies in batches of 500
            if not dependencies:
                return []

            inserted: list[Dependency] = []
            batch_size = 500
            for i in range(0, len(dependencies), batch_size):
                chunk = dependencies[i : i + batch_size]
                payload = [d.model_dump(mode="json") for d in chunk]
                res = client.table("dependencies").insert(payload).execute()
                inserted.extend([Dependency.model_validate(row) for row in res.data])

            return inserted
        except Exception as exc:
            raise RepositoryError(f"Failed to replace dependencies: {exc}") from exc

    async def replace_dependencies(
        self,
        project_id: UUID,
        dependencies: list[Dependency],
        tag_filter: Optional[str] = "jira",
    ) -> list[Dependency]:
        return await run_in_threadpool(
            self._replace_dependencies_sync, project_id, dependencies, tag_filter
        )

    def _delete_by_project_sync(self, project_id: UUID) -> int:
        try:
            client = get_supabase()
            res = client.table("dependencies").delete().eq("project_id", str(project_id)).execute()
            return len(res.data) if res.data else 0
        except Exception as exc:
            raise RepositoryError(f"Failed to delete dependencies: {exc}") from exc

    async def delete_by_project(self, project_id: UUID) -> int:
        return await run_in_threadpool(self._delete_by_project_sync, project_id)
