from pydantic import BaseModel
from typing import List, Literal, Optional
from app.schemas.graph import GraphResponse


# ---------- Request ----------

class DeveloperAbsenceScenario(BaseModel):
    """Simulate what happens if a developer is unavailable."""
    developer_name: str
    absence_days: int


class TaskDelayScenario(BaseModel):
    """Simulate what happens if a specific task is delayed."""
    task_id: str
    delay_days: int


class SimulationRequest(BaseModel):
    """
    What the caller sends to /simulate.
    They provide a scenario type + its parameters.
    The graph is loaded from mock (or Person A's endpoint) internally.
    """
    scenario_type: Literal["developer_absence", "task_delay"]
    developer_absence: Optional[DeveloperAbsenceScenario] = None
    task_delay: Optional[TaskDelayScenario] = None
    project_id: Optional[str] = "MOCK-PROJECT-001"


# ---------- Response ----------

class AffectedTask(BaseModel):
    """A task that is impacted by the simulation scenario."""
    task_id: str
    title: str
    original_assignee: str
    new_assignee: Optional[str] = None
    original_estimate: int        # hours
    new_estimate: Optional[int] = None
    delay_added_days: float = 0.0
    reason: str                   # why this task is affected


class SimulationResult(BaseModel):
    """What /simulate returns."""
    scenario_type: str
    scenario_description: str
    affected_tasks: List[AffectedTask]
    original_finish_days: float   # baseline project duration in days
    new_finish_days: float        # recalculated duration after scenario
    schedule_impact_days: float   # difference (positive = delayed)
    critical_path: List[str]      # task IDs on the critical path
    risk_level: Literal["low", "medium", "high"]
