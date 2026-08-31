from pydantic import BaseModel
from typing import List, Literal


class GraphNode(BaseModel):
    """Represents a single task in the project graph."""
    id: str
    title: str
    status: Literal["todo", "in_progress", "done", "blocked"]
    assignee: str
    estimate: int          # hours
    sprint: str


class GraphEdge(BaseModel):
    """Represents a dependency between two tasks."""
    from_node: str
    to_node: str
    type: Literal["blocks", "depends_on"]


class GraphResponse(BaseModel):
    """
    The agreed contract between Person A (graph builder)
    and Person B (simulation/recommendation engines).
    Person A's /graph endpoint returns this.
    Person B's engines consume this.
    """
    project_id: str
    generated_at: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
