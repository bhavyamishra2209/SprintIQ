"""Graph schemas for the Digital Twin dependency network.

Shared contract consumed by visualization components, simulation engines,
and decision support systems.
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class TaskNode(BaseModel):
    """Represents a node (task) in the dependency graph."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    key: Optional[str] = None
    title: str
    status: str
    assignee_name: Optional[str] = None
    sprint_name: Optional[str] = None
    estimate_hours: Optional[float] = None
    is_critical: bool = False
    earliest_start_hours: float = 0.0
    earliest_finish_hours: float = 0.0
    issue_type: Optional[str] = None
    priority: Optional[str] = None
    story_points: Optional[float] = None
    status_category: Optional[str] = None


class DependencyEdge(BaseModel):
    """Represents a directed dependency edge between tasks."""

    model_config = ConfigDict(from_attributes=True)

    source: str  # from_task id
    target: str  # to_task id
    type: str = "blocks"
    tag: Optional[str] = None
    is_critical: bool = False


class GraphSchema(BaseModel):
    """Complete graph representation with topological and critical path metrics."""

    model_config = ConfigDict(from_attributes=True)

    project_id: str
    nodes: list[TaskNode] = Field(default_factory=list)
    edges: list[DependencyEdge] = Field(default_factory=list)
    critical_path: list[str] = Field(default_factory=list)  # Ordered list of task IDs
    total_duration_hours: float = 0.0
    has_cycles: bool = False
    cycles: list[list[str]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
