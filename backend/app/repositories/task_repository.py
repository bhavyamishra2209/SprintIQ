"""Supabase implementation of TaskRepositoryProtocol."""

from typing import Optional
from uuid import UUID
from starlette.concurrency import run_in_threadpool

from app.core.errors import RepositoryError
from app.core.supabase_client import get_supabase
from app.repositories.base import TaskRepositoryProtocol
from app.schemas.domain import Task


class SupabaseTaskRepository(TaskRepositoryProtocol):
    """Supabase-backed implementation of Task repository."""

    def __init__(self) -> None:
        pass

    def _get_tasks_sync(self, project_id: UUID) -> list[Task]:
        try:
            client = get_supabase()
            res = client.table("tasks").select("*").eq("project_id", str(project_id)).execute()
            return [Task.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch tasks: {exc}") from exc

    async def get_tasks(self, project_id: UUID) -> list[Task]:
        return await run_in_threadpool(self._get_tasks_sync, project_id)

    def _get_task_sync(self, task_id: UUID) -> Optional[Task]:
        try:
            client = get_supabase()
            res = client.table("tasks").select("*").eq("id", str(task_id)).execute()
            if not res.data:
                return None
            return Task.model_validate(res.data[0])
        except Exception as exc:
            raise RepositoryError(f"Failed to fetch task: {exc}") from exc

    async def get_task(self, task_id: UUID) -> Optional[Task]:
        return await run_in_threadpool(self._get_task_sync, task_id)

    def _upsert_tasks_sync(self, tasks: list[Task]) -> list[Task]:
        if not tasks:
            return []
        try:
            client = get_supabase()
            payload = [t.model_dump(mode="json") for t in tasks]
            res = (
                client.table("tasks")
                .upsert(payload, on_conflict="project_id,jira_issue_key")
                .execute()
            )
            return [Task.model_validate(row) for row in res.data]
        except Exception as exc:
            raise RepositoryError(f"Failed to upsert tasks: {exc}") from exc

    async def upsert_tasks(self, tasks: list[Task]) -> list[Task]:
        return await run_in_threadpool(self._upsert_tasks_sync, tasks)
