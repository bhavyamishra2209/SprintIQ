from pydantic import BaseModel
from typing import List, Literal, Optional


# ---------- Request ----------

class RecommendationRequest(BaseModel):
    """
    What the caller sends to /recommend.
    Optionally filter by sprint or focus on a specific task.
    """
    project_id: Optional[str] = "MOCK-PROJECT-001"
    target_sprint: Optional[str] = None   # if None, analyse whole project
    max_suggestions: int = 5              # how many recommendations to return


# ---------- Response ----------

class WorkloadInfo(BaseModel):
    """Current workload snapshot for one developer."""
    developer: str
    current_hours: int       # total estimated hours assigned
    task_count: int
    utilization_pct: float   # 0-100, based on 8hr/day sprint capacity


class ReassignmentSuggestion(BaseModel):
    """A single recommended task reassignment."""
    task_id: str
    task_title: str
    current_assignee: str
    suggested_assignee: str
    reason: str
    hours_saved: float          # reduction in overloaded dev's workload
    confidence: float           # 0.0 - 1.0


class RecommendationResult(BaseModel):
    """What /recommend returns."""
    project_id: str
    workload_summary: List[WorkloadInfo]
    suggestions: List[ReassignmentSuggestion]
    overall_balance_score: float    # 0-100, higher = more balanced
    warning: Optional[str] = None  # e.g. "All developers equally loaded"
