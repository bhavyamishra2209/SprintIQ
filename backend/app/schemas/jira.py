"""Jira request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class SyncSummary(BaseModel):
    """Summary result returned after synchronizing a project with Jira."""

    project_id: UUID
    synced_sprints: int = 0
    synced_developers: int = 0
    synced_tasks: int = 0
    synced_dependencies: int = 0
    warnings: list[str] = Field(default_factory=list)


class JiraHealthResponse(BaseModel):
    """Health check response for Jira connectivity."""

    connected: bool
    mock: bool


class JiraStatusResponse(BaseModel):
    """Status summary of a synced project."""

    project_id: UUID
    last_synced_at: Optional[datetime] = None
    task_count: int = 0
    developer_count: int = 0
    sprint_count: int = 0
    dependency_count: int = 0
