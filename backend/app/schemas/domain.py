"""Domain schemas for SprintIQ core entities.

These models represent Projects, Developers, Sprints, Tasks, and
Dependencies. Repositories and domain services communicate using these
models rather than raw database or API dictionaries.
"""

from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, ConfigDict, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Project(BaseModel):
    """Represents a software development project."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    owner_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    jira_project_key: Optional[str] = None
    jira_board_id: Optional[int] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class Developer(BaseModel):
    """Represents a developer team member working on a project."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    jira_account_id: Optional[str] = None
    display_name: str
    email: Optional[str] = None
    capacity_hours_per_sprint: float = 80.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class Sprint(BaseModel):
    """Represents a development sprint in Agile planning."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    jira_sprint_id: Optional[int] = None
    name: str
    state: Literal["future", "active", "closed"] = "future"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    goal: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class Task(BaseModel):
    """Represents a work item, story, or bug in a project."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    jira_issue_key: Optional[str] = None
    jira_issue_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: Literal["todo", "in_progress", "done", "blocked"] = "todo"
    status_category: Optional[str] = None
    issue_type: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[float] = None
    estimate_hours: Optional[float] = None
    assignee_id: Optional[UUID] = None
    sprint_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    jira_created_at: Optional[datetime] = None
    jira_updated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class Dependency(BaseModel):
    """Represents a directed dependency edge between tasks.

    Semantics: from_task_id must complete BEFORE to_task_id can start.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(default_factory=uuid4)
    project_id: UUID
    from_task_id: UUID
    to_task_id: UUID
    type: str = "blocks"
    tag: Optional[str] = None
    created_at: datetime = Field(default_factory=_now)
