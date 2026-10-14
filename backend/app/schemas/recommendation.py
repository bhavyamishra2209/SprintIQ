"""Pydantic schemas for SprintIQ Recommendation and Optimization Engine."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class RecommendationType(str, Enum):
    """Categorization for optimization recommendations."""
    REASSIGN = "reassign"
    SCOPE = "scope"
    CONCURRENCY = "concurrency"


class WorkloadBeforeAfter(BaseModel):
    """Workload representation before and after applying an optimization."""
    assignee: str
    workload: int  # percentage (0-100+)


class RecommendationItem(BaseModel):
    """Actionable recommendation item produced by the optimization engine."""
    id: str
    type: RecommendationType
    title: str
    savings: str
    impact: str
    risk: str = "Low"
    confidence: float = Field(..., ge=1.0, le=5.0, description="Confidence rating out of 5.0")
    why: str
    before: WorkloadBeforeAfter
    after: WorkloadBeforeAfter
    task_id: Optional[str] = None
    task_key: Optional[str] = None
    from_assignee_id: Optional[str] = None
    to_assignee_id: Optional[str] = None
    suggested_assignee_name: Optional[str] = None
    action_type: str = "reassign"


class WorkloadSummaryItem(BaseModel):
    """Resource allocation summary for an individual team member."""
    developer_id: str
    developer_name: str
    current_hours: float
    capacity_hours: float
    task_count: int
    utilization_pct: float


class MonteCarloSummary(BaseModel):
    """Statistical schedule risk outcomes from Monte Carlo PERT-Beta distribution sampling."""
    iterations: int = 1000
    nominal_duration_hours: float
    mean_duration_hours: float
    p50_duration_hours: float
    p80_duration_hours: float
    p95_duration_hours: float
    on_time_probability_pct: float
    risk_level: str


class MLTaskRiskScore(BaseModel):
    """Machine learning slippage prediction score and factor explanation for a single task."""
    task_id: str
    task_key: str
    title: str
    estimate_hours: float
    is_critical: bool
    in_degree: int
    out_degree: int
    risk_score: float  # 0.0 to 1.0 probability
    risk_level: str  # "Low", "Medium", "High"
    top_risk_factors: list[str]


class ProjectRecommendationResponse(BaseModel):
    """Complete project recommendation payload combining ML risk scores, Monte Carlo, and prescriptive actions."""
    project_id: str
    recommendations: list[RecommendationItem]
    workload_summary: list[WorkloadSummaryItem]
    monte_carlo: MonteCarloSummary
    task_risks: list[MLTaskRiskScore]
    overall_balance_score: float
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ApplyRecommendationRequest(BaseModel):
    """Payload to commit an optimization recommendation directly to the digital twin."""
    action_type: str = "reassign"  # "reassign" | "scope" | "concurrency"
    task_id: str
    new_assignee_id: Optional[str] = None
    target_sprint_id: Optional[str] = None


class ApplyRecommendationResponse(BaseModel):
    """Response returned upon committing an optimization recommendation."""
    success: bool
    message: str
    action_applied: str
    updated_task_id: str
    new_assignee_name: Optional[str] = None
    new_balance_score: Optional[float] = None
