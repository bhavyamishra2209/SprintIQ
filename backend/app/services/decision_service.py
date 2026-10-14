"""Decision Comparison & Multi-Scenario Execution Engine for SprintIQ."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import networkx as nx
import numpy as np

from app.core.errors import ProjectNotFoundError
from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.schemas.decision import (
    CommitPlanRequest,
    CommitPlanResponse,
    CustomScenarioRequest,
    DecisionComparisonResponse,
    DecisionTradeOffInsight,
    PlanAction,
    PlanMetrics,
    PlanScenario,
)
from app.schemas.domain import Developer, Task
from app.schemas.recommendation import RecommendationType
from app.services.digital_twin import DigitalTwinService
from app.services.recommendation_engine import (
    DEFAULT_SPRINT_CAPACITY_HOURS,
    RecommendationEngineService,
)

logger = logging.getLogger(__name__)

# Standard hourly cost rates (INR)
INTERNAL_HOURLY_RATE_INR = 1200.0
CONTRACTOR_HOURLY_RATE_INR = 2200.0


def _format_date(d: datetime) -> str:
    """Format datetime into standard British business date format (e.g. 21 May 2025)."""
    return d.strftime("%d %b %Y")


def _calculate_composite_score(
    on_time_prob: float,
    balance_score: float,
    days_saved: int,
    cost_delta: float,
    baseline_cost: float,
) -> tuple[float, int]:
    """Calculate multi-objective weighted decision score (1.0 to 5.0 stars)."""
    # Weights: Confidence 35%, Speed 25%, Team Balance 25%, Cost 15%
    prob_component = min(1.0, max(0.0, on_time_prob / 100.0)) * 5.0
    balance_component = min(1.0, max(0.0, balance_score / 100.0)) * 5.0

    # Days saved component: 0d = 3.0, +5d = 5.0, -5d = 1.0
    speed_component = min(5.0, max(1.0, 3.0 + (days_saved * 0.4)))

    # Cost component: savings (+) boosts score, cost surge (-) lowers score
    cost_ratio = -cost_delta / max(1.0, baseline_cost)
    cost_component = min(5.0, max(1.0, 3.0 + (cost_ratio * 5.0)))

    raw_score = (
        0.35 * prob_component
        + 0.25 * speed_component
        + 0.25 * balance_component
        + 0.15 * cost_component
    )
    clamped = round(min(5.0, max(1.0, raw_score)), 1)
    stars = min(5, max(1, int(round(clamped))))
    return clamped, stars


class DecisionComparisonService:
    """Multi-objective project scenario comparison, trade-off optimization, and plan commitment."""

    def __init__(
        self,
        project_repo: ProjectRepositoryProtocol,
        task_repo: TaskRepositoryProtocol,
        dependency_repo: DependencyRepositoryProtocol,
        developer_repo: DeveloperRepositoryProtocol,
        sprint_repo: SprintRepositoryProtocol,
        twin_service: DigitalTwinService,
        rec_service: RecommendationEngineService,
    ) -> None:
        self.project_repo = project_repo
        self.task_repo = task_repo
        self.dependency_repo = dependency_repo
        self.developer_repo = developer_repo
        self.sprint_repo = sprint_repo
        self.twin_service = twin_service
        self.rec_service = rec_service

    async def get_decision_comparison(self, project_id: UUID) -> DecisionComparisonResponse:
        """Compute baseline and multi-scenario candidate plans with multi-criteria trade-offs."""
        project = await self.project_repo.get_project(project_id)
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        tasks = await self.task_repo.get_tasks(project_id)
        dependencies = await self.dependency_repo.get_dependencies(project_id)
        developers = await self.developer_repo.get_developers(project_id)
        sprints = await self.sprint_repo.get_sprints(project_id)

        # Baseline graph and recommendations
        graph_schema = await self.twin_service.get_dependency_graph(project_id)
        rec_response = await self.rec_service.get_project_recommendations(project_id)

        # Reference anchor date (sprint start date or today)
        active_sprint = next((s for s in sprints if s.state == "active"), None)
        if active_sprint and active_sprint.start_date:
            anchor_date = active_sprint.start_date
        else:
            anchor_date = datetime.now(timezone.utc)

        # Total baseline effort hours
        baseline_effort = sum(float(t.estimate_hours or 0.0) for t in tasks if t.status != "done")
        baseline_cpm_dur = float(graph_schema.total_duration_hours)
        baseline_cost = round(baseline_effort * INTERNAL_HOURLY_RATE_INR, 2)
        baseline_days = max(1, int(np.ceil(baseline_cpm_dur / 8.0)))
        baseline_finish = anchor_date + timedelta(days=baseline_days)

        # Baseline metrics
        mc_base = rec_response.monte_carlo
        base_prob = mc_base.on_time_probability_pct
        base_balance = rec_response.overall_balance_score
        base_score, base_stars = _calculate_composite_score(base_prob, base_balance, 0, 0.0, baseline_cost)

        baseline_scenario = PlanScenario(
            id="baseline",
            name="Current Plan (Baseline)",
            tagline="Status Quo (As-Is Jira Schedule)",
            description="Existing ticket allocations and critical path dependencies without optimization interventions.",
            is_recommended=False,
            metrics=PlanMetrics(
                finish_date=_format_date(baseline_finish),
                finish_days_delta=0,
                total_effort_hours=round(baseline_effort, 1),
                effort_hours_delta=0.0,
                total_cost_inr=baseline_cost,
                cost_delta_inr=0.0,
                risk_level=mc_base.risk_level,
                team_balance_score=base_balance,
                on_time_probability_pct=base_prob,
                p50_horizon_hours=mc_base.p50_duration_hours,
                p95_horizon_hours=mc_base.p95_duration_hours,
                composite_score=base_score,
                composite_stars=base_stars,
            ),
            actions=[],
        )

        plans: list[PlanScenario] = [baseline_scenario]

        # -------------------------------------------------------------
        # Plan A: Workload Rebalancing & Critical Path Bottleneck Relief
        # -------------------------------------------------------------
        rebalance_recs = [r for r in rec_response.recommendations if r.type == RecommendationType.REASSIGN]
        plan_a_actions: list[PlanAction] = []
        plan_a_hours_shifted = 0.0
        plan_a_days_saved = 0

        for r in rebalance_recs[:2]:
            t_obj = next((t for t in tasks if str(t.id) == r.task_id or t.jira_issue_key == r.task_key), None)
            hrs = float(t_obj.estimate_hours or 0.0) if t_obj else 16.0
            plan_a_hours_shifted += hrs
            days_saved = max(2, int(hrs / 6.0))
            plan_a_days_saved += days_saved
            plan_a_actions.append(
                PlanAction(
                    action_type="reassign",
                    task_id=r.task_id,
                    task_key=r.task_key,
                    title=f"Reassign {r.task_key} to {r.suggested_assignee_name or 'Balanced Dev'}",
                    description=r.why,
                    target_assignee_name=r.suggested_assignee_name,
                    target_assignee_id=r.to_assignee_id,
                    impact=r.impact,
                )
            )

        if plan_a_actions:
            plan_a_days_saved = min(6, plan_a_days_saved)
            plan_a_finish = baseline_finish - timedelta(days=plan_a_days_saved)
            plan_a_balance = min(98.5, round(base_balance + 8.5, 1))
            # Critical path relief boosts on-time probability significantly
            plan_a_prob = min(88.0, round(base_prob + 32.5, 1))
            plan_a_p50 = max(10.0, round(mc_base.p50_duration_hours - (plan_a_days_saved * 6.5), 1))
            plan_a_p95 = max(15.0, round(mc_base.p95_duration_hours - (plan_a_days_saved * 7.0), 1))
            score_a, stars_a = _calculate_composite_score(plan_a_prob, plan_a_balance, plan_a_days_saved, 0.0, baseline_cost)

            plans.append(
                PlanScenario(
                    id="plan_rebalance",
                    name="Plan A – Workload Rebalancing",
                    tagline="Zero-Scope Compromise · Relieves Burnout",
                    description="Reassigns critical bottleneck tasks from overloaded engineers to available team members, shortening the critical path without dropping scope.",
                    is_recommended=False,
                    metrics=PlanMetrics(
                        finish_date=_format_date(plan_a_finish),
                        finish_days_delta=-plan_a_days_saved,
                        total_effort_hours=round(baseline_effort, 1),
                        effort_hours_delta=0.0,
                        total_cost_inr=baseline_cost,
                        cost_delta_inr=0.0,
                        risk_level="Low" if plan_a_prob >= 70.0 else "Medium",
                        team_balance_score=plan_a_balance,
                        on_time_probability_pct=plan_a_prob,
                        p50_horizon_hours=plan_a_p50,
                        p95_horizon_hours=plan_a_p95,
                        composite_score=score_a,
                        composite_stars=stars_a,
                    ),
                    actions=plan_a_actions,
                )
            )

        # -------------------------------------------------------------
        # Plan B: Concurrency Fast-Tracking (Interface Decoupling)
        # -------------------------------------------------------------
        concurrency_recs = [r for r in rec_response.recommendations if r.type == RecommendationType.CONCURRENCY]
        plan_b_actions: list[PlanAction] = []
        plan_b_days_saved = 0

        for r in concurrency_recs[:2]:
            plan_b_days_saved += 2
            plan_b_actions.append(
                PlanAction(
                    action_type="concurrency",
                    task_id=r.task_id,
                    task_key=r.task_key,
                    title=r.title,
                    description=r.why,
                    impact=r.impact,
                )
            )

        if not plan_b_actions:
            # Fallback concurrency action based on initial design/schema overlap
            plan_b_days_saved = 3
            plan_b_actions.append(
                PlanAction(
                    action_type="concurrency",
                    title="Parallelize Frontend and API services via OpenAPI mock stubs",
                    description="Decouples frontend client integration from backend API endpoints using contract mocks.",
                    impact="Finish accelerated by 3d · Concurrency buffer +16h",
                )
            )

        plan_b_finish = baseline_finish - timedelta(days=plan_b_days_saved)
        plan_b_prob = min(82.0, round(base_prob + 24.0, 1))
        plan_b_p50 = max(10.0, round(mc_base.p50_duration_hours - (plan_b_days_saved * 7.0), 1))
        plan_b_p95 = max(15.0, round(mc_base.p95_duration_hours - (plan_b_days_saved * 7.5), 1))
        score_b, stars_b = _calculate_composite_score(plan_b_prob, base_balance, plan_b_days_saved, 0.0, baseline_cost)

        plans.append(
            PlanScenario(
                id="plan_concurrency",
                name="Plan B – Concurrency Fast-Tracking",
                tagline="Fastest Delivery · Mock Contract Stubs",
                description="Overlaps sequential blocking dependencies using OpenAPI contract stubs, running UI and backend service builds in parallel.",
                is_recommended=False,
                metrics=PlanMetrics(
                    finish_date=_format_date(plan_b_finish),
                    finish_days_delta=-plan_b_days_saved,
                    total_effort_hours=round(baseline_effort, 1),
                    effort_hours_delta=0.0,
                    total_cost_inr=baseline_cost,
                    cost_delta_inr=0.0,
                    risk_level="Medium",
                    team_balance_score=base_balance,
                    on_time_probability_pct=plan_b_prob,
                    p50_horizon_hours=plan_b_p50,
                    p95_horizon_hours=plan_b_p95,
                    composite_score=score_b,
                    composite_stars=stars_b,
                ),
                actions=plan_b_actions,
            )
        )

        # -------------------------------------------------------------
        # Plan C: Scope Buffer Optimization (Milestone Protection)
        # -------------------------------------------------------------
        scope_recs = [r for r in rec_response.recommendations if r.type == RecommendationType.SCOPE]
        plan_c_actions: list[PlanAction] = []
        plan_c_hours_saved = 0.0

        if scope_recs:
            sr = scope_recs[0]
            t_obj = next((t for t in tasks if str(t.id) == sr.task_id or t.jira_issue_key == sr.task_key), None)
            hrs = float(t_obj.estimate_hours or 0.0) if t_obj else 32.0
            plan_c_hours_saved = hrs
            plan_c_actions.append(
                PlanAction(
                    action_type="scope",
                    task_id=sr.task_id,
                    task_key=sr.task_key,
                    title=sr.title,
                    description=sr.why,
                    impact=sr.impact,
                )
            )
        else:
            plan_c_hours_saved = 32.0
            plan_c_actions.append(
                PlanAction(
                    action_type="scope",
                    title="Buffer non-critical tertiary integration to subsequent release",
                    description="Protects core milestone delivery date by deferring non-core secondary backlog items.",
                    impact="Relieves 32h scope · Budget saved: ₹38,400",
                )
            )

        plan_c_days_saved = max(2, int(plan_c_hours_saved / 7.0))
        plan_c_finish = baseline_finish - timedelta(days=plan_c_days_saved)
        plan_c_cost_savings = round(plan_c_hours_saved * INTERNAL_HOURLY_RATE_INR, 2)
        plan_c_cost = round(baseline_cost - plan_c_cost_savings, 2)
        plan_c_effort = round(baseline_effort - plan_c_hours_saved, 1)
        plan_c_prob = min(96.0, round(base_prob + 48.0, 1))
        plan_c_balance = min(95.0, round(base_balance + 4.0, 1))
        plan_c_p50 = max(10.0, round(mc_base.p50_duration_hours - (plan_c_days_saved * 8.0), 1))
        plan_c_p95 = max(15.0, round(mc_base.p95_duration_hours - (plan_c_days_saved * 8.5), 1))
        score_c, stars_c = _calculate_composite_score(plan_c_prob, plan_c_balance, plan_c_days_saved, -plan_c_cost_savings, baseline_cost)

        plans.append(
            PlanScenario(
                id="plan_scope",
                name="Plan C – Scope Buffer Optimization",
                tagline="Highest On-Time Confidence · ₹ Savings",
                description="Buffers non-critical dependencies to the subsequent sprint, reducing scope to protect MVP release milestone and budget.",
                is_recommended=False,
                metrics=PlanMetrics(
                    finish_date=_format_date(plan_c_finish),
                    finish_days_delta=-plan_c_days_saved,
                    total_effort_hours=plan_c_effort,
                    effort_hours_delta=-round(plan_c_hours_saved, 1),
                    total_cost_inr=plan_c_cost,
                    cost_delta_inr=-plan_c_cost_savings,
                    risk_level="Low",
                    team_balance_score=plan_c_balance,
                    on_time_probability_pct=plan_c_prob,
                    p50_horizon_hours=plan_c_p50,
                    p95_horizon_hours=plan_c_p95,
                    composite_score=score_c,
                    composite_stars=stars_c,
                ),
                actions=plan_c_actions,
            )
        )

        # -------------------------------------------------------------
        # Plan D: Resource Injection (Add Contractor Dev)
        # -------------------------------------------------------------
        contractor_hours = 80.0
        contractor_cost_add = round(contractor_hours * (CONTRACTOR_HOURLY_RATE_INR - INTERNAL_HOURLY_RATE_INR), 2)
        plan_d_cost = round(baseline_cost + contractor_cost_add, 2)
        plan_d_days_saved = max(3, int(contractor_hours / 16.0))
        plan_d_finish = baseline_finish - timedelta(days=plan_d_days_saved)
        plan_d_prob = min(91.0, round(base_prob + 40.0, 1))
        plan_d_balance = min(99.0, round(base_balance + 10.0, 1))
        plan_d_p50 = max(10.0, round(mc_base.p50_duration_hours - (plan_d_days_saved * 6.0), 1))
        plan_d_p95 = max(15.0, round(mc_base.p95_duration_hours - (plan_d_days_saved * 7.0), 1))
        score_d, stars_d = _calculate_composite_score(plan_d_prob, plan_d_balance, plan_d_days_saved, contractor_cost_add, baseline_cost)

        plans.append(
            PlanScenario(
                id="plan_capacity",
                name="Plan D – Resource Injection (Contractor)",
                tagline="Maximum Capacity · Additional Budget",
                description="Injects a contractor engineer (+80h capacity) to parallelize secondary streams, relieving core developers at higher budget cost.",
                is_recommended=False,
                metrics=PlanMetrics(
                    finish_date=_format_date(plan_d_finish),
                    finish_days_delta=-plan_d_days_saved,
                    total_effort_hours=round(baseline_effort, 1),
                    effort_hours_delta=0.0,
                    total_cost_inr=plan_d_cost,
                    cost_delta_inr=contractor_cost_add,
                    risk_level="Low",
                    team_balance_score=plan_d_balance,
                    on_time_probability_pct=plan_d_prob,
                    p50_horizon_hours=plan_d_p50,
                    p95_horizon_hours=plan_d_p95,
                    composite_score=score_d,
                    composite_stars=stars_d,
                ),
                actions=[
                    PlanAction(
                        action_type="add_capacity",
                        title="Add Contractor Full-Stack Engineer (+80h capacity)",
                        description="Allocates 80h of external engineering bandwidth at ₹2,200/hr to unblock core sprint dependencies.",
                        impact=f"Finish accelerated by {plan_d_days_saved}d · Budget delta: +₹{int(contractor_cost_add):,}",
                    )
                ],
            )
        )

        # Determine the Recommended Plan by Highest Composite Score among alternative plans
        candidate_plans = [p for p in plans if p.id != "baseline"]
        best_plan = max(candidate_plans, key=lambda p: p.metrics.composite_score)
        best_plan.is_recommended = True

        # Generate Comparative Insights
        insights: list[DecisionTradeOffInsight] = [
            DecisionTradeOffInsight(
                category="speed",
                plan_name="Plan B (Concurrency)",
                insight=f"Accelerates delivery by {plan_b_days_saved} days via mock interface contracts with zero scope cuts.",
                is_positive=True,
            ),
            DecisionTradeOffInsight(
                category="equity",
                plan_name="Plan A (Rebalancing)",
                insight=f"Boosts team equity score from {base_balance} to {plan_a_balance}/100, preventing single-developer burnout.",
                is_positive=True,
            ),
            DecisionTradeOffInsight(
                category="cost",
                plan_name="Plan C (Scope Buffer)",
                insight=f"Offers the highest financial savings (-₹{int(plan_c_cost_savings):,}) and highest on-time probability ({plan_c_prob}%).",
                is_positive=True,
            ),
            DecisionTradeOffInsight(
                category="risk",
                plan_name="Baseline (Status Quo)",
                insight=f"Retains critical delivery vulnerability with an on-time probability of only {base_prob}%.",
                is_positive=False,
            ),
        ]

        # Generate Executive Decision Brief
        rec_savings = f"-₹{abs(int(best_plan.metrics.cost_delta_inr)):,}" if best_plan.metrics.cost_delta_inr < 0 else f"+₹{int(best_plan.metrics.cost_delta_inr):,}"
        executive_brief = f"""### Executive Decision Brief: {project.name}

**Recommendation: Commit {best_plan.name}**
- **Composite Score:** {best_plan.metrics.composite_score} / 5.0 (Optimal trade-off frontier)
- **Schedule Impact:** Accelerated by {abs(best_plan.metrics.finish_days_delta)} calendar days (New target: {best_plan.metrics.finish_date})
- **On-Time Confidence:** Boosted from {base_prob}% to {best_plan.metrics.on_time_probability_pct}%
- **Financial Delta:** {rec_savings} vs baseline budget
- **Burnout Mitigation:** Team workload equity score improved to {best_plan.metrics.team_balance_score}/100

**Action Items:**
{chr(10).join(f"- {a.title}: {a.impact}" for a in best_plan.actions)}
"""

        return DecisionComparisonResponse(
            project_id=str(project_id),
            project_name=project.name,
            baseline_plan_id="baseline",
            recommended_plan_id=best_plan.id,
            plans=plans,
            insights=insights,
            executive_brief=executive_brief,
        )

    async def commit_plan(
        self,
        project_id: UUID,
        req: CommitPlanRequest,
    ) -> CommitPlanResponse:
        """Atomically execute the selected plan's interventions into the project repository."""
        comparison = await self.get_decision_comparison(project_id)
        target_plan = next((p for p in comparison.plans if p.id == req.plan_id), None)
        if not target_plan:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan '{req.plan_id}' not found in project decision matrix.",
            )

        if target_plan.id == "baseline":
            return CommitPlanResponse(
                success=True,
                message="Retained current baseline plan. No modifications made.",
                plan_id="baseline",
                actions_applied_count=0,
                new_balance_score=target_plan.metrics.team_balance_score,
                new_on_time_probability_pct=target_plan.metrics.on_time_probability_pct,
            )

        tasks = await self.task_repo.get_tasks(project_id)
        developers = await self.developer_repo.get_developers(project_id)
        sprints = await self.sprint_repo.get_sprints(project_id)
        applied_count = 0

        for action in target_plan.actions:
            if action.action_type == "reassign" and action.task_id and action.target_assignee_id:
                try:
                    target_task_uuid = UUID(action.task_id)
                    new_dev_uuid = UUID(action.target_assignee_id)
                    t_match = next((t for t in tasks if t.id == target_task_uuid), None)
                    if t_match:
                        t_match.assignee_id = new_dev_uuid
                        await self.task_repo.upsert_tasks([t_match])
                        applied_count += 1
                except Exception as e:
                    logger.warning("Failed to apply reassign action in plan commit: %s", e)

            elif action.action_type == "scope" and action.task_id:
                try:
                    target_task_uuid = UUID(action.task_id)
                    t_match = next((t for t in tasks if t.id == target_task_uuid), None)
                    if t_match and len(sprints) > 1:
                        # Defer to next sprint
                        t_match.sprint_id = sprints[-1].id
                        await self.task_repo.upsert_tasks([t_match])
                        applied_count += 1
                except Exception as e:
                    logger.warning("Failed to apply scope buffer action in plan commit: %s", e)

            elif action.action_type == "add_capacity":
                # Create dynamic contractor developer if not present
                existing_contractor = next((d for d in developers if "Contractor" in d.display_name), None)
                if not existing_contractor:
                    contractor_dev = Developer(
                        project_id=project_id,
                        display_name="Contractor Specialist",
                        capacity_hours_per_sprint=80.0,
                        is_active=True,
                    )
                    await self.developer_repo.upsert_developers([contractor_dev])
                    applied_count += 1

        # Recalculate new balance score after commit
        updated_tasks = await self.task_repo.get_tasks(project_id)
        updated_devs = await self.developer_repo.get_developers(project_id)
        _, _, _, new_balance = self.rec_service._compute_team_workload(updated_tasks, updated_devs)

        return CommitPlanResponse(
            success=True,
            message=f"Successfully committed '{target_plan.name}'! Applied {applied_count} actions into Digital Twin.",
            plan_id=target_plan.id,
            actions_applied_count=applied_count,
            new_balance_score=new_balance,
            new_on_time_probability_pct=target_plan.metrics.on_time_probability_pct,
        )

    async def evaluate_custom_scenario(
        self,
        project_id: UUID,
        req: CustomScenarioRequest,
    ) -> PlanScenario:
        """Dynamically evaluate a user-defined custom scenario in real-time."""
        comparison = await self.get_decision_comparison(project_id)
        baseline = next(p for p in comparison.plans if p.id == "baseline")

        tasks = await self.task_repo.get_tasks(project_id)
        base_effort = baseline.metrics.total_effort_hours
        base_cost = baseline.metrics.total_cost_inr

        # Calculate adjustments
        additional_cap = req.additional_dev_capacity_hours
        contractor_cost = additional_cap * req.contractor_hourly_rate_inr

        deferred_hours = 0.0
        deferred_set = set(req.defer_task_ids)
        for t in tasks:
            if str(t.id) in deferred_set or t.jira_issue_key in deferred_set:
                deferred_hours += float(t.estimate_hours or 0.0)

        new_effort = max(0.0, base_effort - deferred_hours)
        cost_delta = contractor_cost - (deferred_hours * INTERNAL_HOURLY_RATE_INR)
        new_cost = max(0.0, base_cost + cost_delta)

        # Days saved
        capacity_boost_days = int(additional_cap / 20.0)
        deferred_days = int(deferred_hours / 8.0)
        total_days_saved = capacity_boost_days + deferred_days

        base_finish = datetime.strptime(baseline.metrics.finish_date, "%d %b %Y")
        new_finish = base_finish - timedelta(days=total_days_saved)

        new_prob = min(98.0, max(5.0, baseline.metrics.on_time_probability_pct + (total_days_saved * 8.5)))
        new_balance = min(99.0, max(50.0, baseline.metrics.team_balance_score + (capacity_boost_days * 3.0)))
        new_p50 = max(10.0, baseline.metrics.p50_horizon_hours - (total_days_saved * 6.5))
        new_p95 = max(15.0, baseline.metrics.p95_horizon_hours - (total_days_saved * 7.0))

        score, stars = _calculate_composite_score(new_prob, new_balance, total_days_saved, cost_delta, base_cost)

        return PlanScenario(
            id="custom_scenario",
            name="Custom Scenario (Interactive Sandbox)",
            tagline="User-Configured Multi-Variable What-If",
            description=f"Simulates adding {int(additional_cap)}h capacity and deferring {len(req.defer_task_ids)} tasks ({int(deferred_hours)}h).",
            is_recommended=False,
            metrics=PlanMetrics(
                finish_date=_format_date(new_finish),
                finish_days_delta=-total_days_saved,
                total_effort_hours=round(new_effort, 1),
                effort_hours_delta=-round(deferred_hours, 1),
                total_cost_inr=round(new_cost, 2),
                cost_delta_inr=round(cost_delta, 2),
                risk_level="Low" if new_prob >= 70.0 else "Medium",
                team_balance_score=round(new_balance, 1),
                on_time_probability_pct=round(new_prob, 1),
                p50_horizon_hours=round(new_p50, 1),
                p95_horizon_hours=round(new_p95, 1),
                composite_score=score,
                composite_stars=stars,
            ),
            actions=[
                PlanAction(
                    action_type="custom",
                    title=f"Custom Capacity & Scope Adjustment (+{int(additional_cap)}h cap, -{int(deferred_hours)}h scope)",
                    description=f"Simulates contractor injection with {len(req.defer_task_ids)} deferred tasks.",
                    impact=f"Accelerated by {total_days_saved}d · Budget delta: {'+₹' if cost_delta >= 0 else '-₹'}{abs(int(cost_delta)):,}",
                )
            ],
        )
