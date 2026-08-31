from pydantic import BaseModel
from typing import List, Literal, Optional


# ---------- Request ----------

class ScenarioInput(BaseModel):
    """One scenario to include in the comparison."""
    label: str                                        # e.g. "Plan A - Reassign Tasks"
    scenario_type: Literal["developer_absence", "task_delay", "baseline"]
    developer_name: Optional[str] = None             # for developer_absence
    absence_days: Optional[int] = None
    task_id: Optional[str] = None                    # for task_delay
    delay_days: Optional[int] = None


class ComparisonRequest(BaseModel):
    """
    What the caller sends to /compare.
    Always includes a baseline + one or more scenarios to compare against it.
    """
    project_id: Optional[str] = "MOCK-PROJECT-001"
    scenarios: List[ScenarioInput]                   # first one should be baseline


# ---------- Response ----------

class ScenarioMetrics(BaseModel):
    """Computed metrics for one scenario."""
    label: str
    finish_days: float
    total_effort_hours: int
    risk_level: Literal["low", "medium", "high"]
    critical_path: List[str]                         # task IDs
    schedule_delta_days: float                       # vs baseline (0 for baseline)
    effort_delta_hours: int                          # vs baseline


class ComparisonResult(BaseModel):
    """What /compare returns."""
    project_id: str
    baseline_label: str
    scenarios: List[ScenarioMetrics]
    recommended_plan: str                            # label of best scenario
    recommendation_reason: str
