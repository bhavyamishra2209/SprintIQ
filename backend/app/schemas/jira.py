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
    jira_project_key: Optional[str] = None
    is_live_connected: bool = False


class JiraConnectRequest(BaseModel):
    """Request payload to connect a real Jira project dynamically without .env changes."""

    jira_base_url: str = Field(..., description="Jira workspace domain, e.g. https://domain.atlassian.net")
    jira_email: str = Field(..., description="Atlassian account email")
    jira_api_token: str = Field(..., description="Jira Cloud API token")
    jira_project_key: str = Field(..., description="Project key, e.g. SCRUM, PROJ")
    jira_board_id: Optional[int] = Field(None, description="Agile board ID")
    project_name: Optional[str] = Field(None, description="Display name for the project")


class JiraTestConnectionRequest(BaseModel):
    """Request payload to test credentials against Jira Cloud."""

    jira_base_url: str
    jira_email: str
    jira_api_token: str
