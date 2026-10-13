"""Supabase implementation of ProjectRepositoryProtocol."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from starlette.concurrency import run_in_threadpool

from app.core.errors import RepositoryError
from app.core.supabase_client import get_supabase
from app.repositories.base import ProjectRepositoryProtocol
from app.schemas.domain import Project


class SupabaseProjectRepository(ProjectRepositoryProtocol):
    """Supabase-backed implementation of Project repository."""

    def __init__(self) -> None:
        pass

    def _get_project_sync(self, project_id: UUID) -> Optional[Project]:
        try:
            client = get_supabase()
            res = client.table("projects").select("*").eq("id", str(project_id)).execute()
            if not res.data:
                return None
            return Project.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch project: {exc}") from exc

    async def get_project(self, project_id: UUID) -> Optional[Project]:
        return await run_in_threadpool(self._get_project_sync, project_id)

    def _get_project_by_key_sync(self, jira_project_key: str) -> Optional[Project]:
        try:
            client = get_supabase()
            res = client.table("projects").select("*").eq("jira_project_key", jira_project_key).execute()
            if not res.data:
                return None
            return Project.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch project by key: {exc}") from exc

    async def get_project_by_key(self, jira_project_key: str) -> Optional[Project]:
        return await run_in_threadpool(self._get_project_by_key_sync, jira_project_key)

    def _upsert_project_sync(self, project: Project) -> Project:
        try:
            client = get_supabase()
            payload = project.model_dump(mode="json")
            res = client.table("projects").upsert(payload, on_conflict="owner_id,jira_project_key").execute()
            if not res.data:
                return project
            return Project.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to upsert project: {exc}") from exc

    async def upsert_project(self, project: Project) -> Project:
        return await run_in_threadpool(self._upsert_project_sync, project)

    def _update_last_synced_at_sync(self, project_id: UUID, last_synced_at: datetime) -> None:
        try:
            client = get_supabase()
            client.table("projects").update({"last_synced_at": last_synced_at.isoformat()}).eq("id", str(project_id)).execute()
        except Exception as exc:
            raise RepositoryError(f"Failed to update project last_synced_at: {exc}") from exc

    async def update_last_synced_at(self, project_id: UUID, last_synced_at: datetime) -> None:
        await run_in_threadpool(self._update_last_synced_at_sync, project_id, last_synced_at)
