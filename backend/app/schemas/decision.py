"""Domain schemas for Decision Comparison multi-scenario project execution."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class PlanAction(BaseModel):
    """An individual atomic action that comprises an execution plan."""

    action_type: str = Field(..., description="Action type: reassign, scope, concurrency, add_capacity")
    task_id: Optional[str] = None
    task_key: Optional[str] = None
    title: str
    description: str
    target_assignee_name: Optional[str] = None
    target_assignee_id: Optional[str] = None
    impact: str


class PlanMetrics(BaseModel):
    """Calculated operational and statistical metrics for an execution plan."""

    finish_date: str
    finish_days_delta: int = Field(0, description="Difference in calendar days vs baseline (negative = faster)")
    total_effort_hours: float
    effort_hours_delta: float = Field(0.0, description="Difference in effort hours vs baseline")
    total_cost_inr: float
    cost_delta_inr: float = Field(0.0, description="Difference in cost vs baseline (negative = savings)")
    risk_level: str = Field("Medium", description="Low, Medium, High")
    team_balance_score: float = Field(..., description="Workload coefficient of variation score (0 - 100)")
    on_time_probability_pct: float = Field(..., description="Monte Carlo on-time delivery probability (0 - 100)")
    p50_horizon_hours: float
    p95_horizon_hours: float
    composite_score: float = Field(..., description="Multi-objective decision score out of 5.0")
    composite_stars: int = Field(..., ge=1, le=5)


class PlanScenario(BaseModel):
    """A candidate execution plan comparing trade-offs against baseline."""

    id: str = Field(..., description="Unique plan identifier (e.g. baseline, plan_rebalance, plan_concurrency, plan_scope)")
    name: str
    tagline: str
    description: str
    is_recommended: bool = False
    metrics: PlanMetrics
    actions: list[PlanAction] = Field(default_factory=list)


class DecisionTradeOffInsight(BaseModel):
    """A comparative insight highlighting key advantages or risks of a plan."""

    category: str = Field(..., description="speed, cost, risk, equity")
    plan_name: str
    insight: str
    is_positive: bool = True


class DecisionComparisonResponse(BaseModel):
    """Complete multi-scenario decision comparison response."""

    project_id: str
    project_name: str
    baseline_plan_id: str = "baseline"
    recommended_plan_id: str
    plans: list[PlanScenario]
    insights: list[DecisionTradeOffInsight]
    executive_brief: str


class CommitPlanRequest(BaseModel):
    """Request to commit a candidate plan into the Digital Twin store."""

    plan_id: str


class CommitPlanResponse(BaseModel):
    """Response returned when a plan is committed."""

    success: bool
    message: str
    plan_id: str
    actions_applied_count: int
    new_balance_score: float
    new_on_time_probability_pct: float


class CustomScenarioRequest(BaseModel):
    """Request to evaluate a custom user-configured what-if scenario."""

    additional_dev_capacity_hours: float = Field(0.0, ge=0.0, le=320.0)
    contractor_hourly_rate_inr: float = Field(2200.0, ge=0.0)
    defer_task_ids: list[str] = Field(default_factory=list)
    reassignments: list[dict[str, str]] = Field(
        default_factory=list,
        description="List of dicts: {'task_id': '...', 'new_assignee_id': '...'}",
    )
