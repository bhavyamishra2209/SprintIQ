"""
decision_comparison.py
----------------------
Decision Comparison Engine.

Takes multiple scenarios, runs each one through the simulation engine,
then diffs every scenario against the baseline and returns a side-by-side
comparison with a recommended plan.
"""

from app.schemas.comparison import (
    ComparisonRequest,
    ComparisonResult,
    ScenarioInput,
    ScenarioMetrics,
)
from app.schemas.simulation import SimulationRequest, DeveloperAbsenceScenario, TaskDelayScenario
from app.services.simulation import run_simulation
from app.services.graph_loader import load_graph, build_nx_graph, get_critical_path

HOURS_PER_DAY = 8


def _get_baseline_metrics(project_id: str, label: str) -> ScenarioMetrics:
    """
    Compute baseline metrics — no scenario applied, just the raw graph.
    """
    graph = load_graph(project_id)
    G = build_nx_graph(graph)

    total_hours = sum(d.get("estimate", 0) for _, d in G.nodes(data=True))
    critical_path = get_critical_path(G)
    cp_hours = sum(G.nodes[n].get("estimate", 0) for n in critical_path)
    finish_days = round(cp_hours / HOURS_PER_DAY, 2)

    return ScenarioMetrics(
        label=label,
        finish_days=finish_days,
        total_effort_hours=total_hours,
        risk_level="low",
        critical_path=critical_path,
        schedule_delta_days=0.0,
        effort_delta_hours=0
    )


def _run_scenario_metrics(
    scenario: ScenarioInput,
    project_id: str,
    baseline: ScenarioMetrics
) -> ScenarioMetrics:
    """
    Run one scenario through the simulation engine and
    return its metrics relative to the baseline.
    """
    # Build SimulationRequest from the ScenarioInput
    sim_request = SimulationRequest(
        scenario_type=scenario.scenario_type,
        project_id=project_id,
        developer_absence=(
            DeveloperAbsenceScenario(
                developer_name=scenario.developer_name,
                absence_days=scenario.absence_days or 1
            )
            if scenario.scenario_type == "developer_absence"
            else None
        ),
        task_delay=(
            TaskDelayScenario(
                task_id=scenario.task_id,
                delay_days=scenario.delay_days or 1
            )
            if scenario.scenario_type == "task_delay"
            else None
        )
    )

    result = run_simulation(sim_request)

    # Total effort = sum of all task estimates (new estimates where changed)
    graph = load_graph(project_id)
    G = build_nx_graph(graph)

    # Apply estimate changes from affected tasks
    for affected in result.affected_tasks:
        if affected.new_estimate and affected.task_id in G.nodes:
            G.nodes[affected.task_id]["estimate"] = affected.new_estimate

    total_hours = sum(d.get("estimate", 0) for _, d in G.nodes(data=True))

    return ScenarioMetrics(
        label=scenario.label,
        finish_days=result.new_finish_days,
        total_effort_hours=total_hours,
        risk_level=result.risk_level,
        critical_path=result.critical_path,
        schedule_delta_days=round(result.new_finish_days - baseline.finish_days, 2),
        effort_delta_hours=total_hours - baseline.total_effort_hours
    )


def _pick_best_plan(scenarios: list[ScenarioMetrics], baseline_label: str) -> tuple[str, str]:
    """
    Pick the recommended plan using a simple scoring:
    - Lowest finish_days gets highest weight
    - Lower risk level is better
    - Excludes the baseline from being "recommended"

    Returns (recommended_label, reason)
    """
    risk_score = {"low": 0, "medium": 1, "high": 2}

    non_baseline = [s for s in scenarios if s.label != baseline_label]
    if not non_baseline:
        return baseline_label, "Only baseline available."

    # Score each scenario: lower is better
    def score(s: ScenarioMetrics) -> float:
        return s.finish_days + (risk_score[s.risk_level] * 5)

    best = min(non_baseline, key=score)

    reason_parts = []
    if best.schedule_delta_days < 0:
        reason_parts.append(
            f"finishes {abs(best.schedule_delta_days)} days earlier than baseline"
        )
    elif best.schedule_delta_days == 0:
        reason_parts.append("matches baseline timeline")
    else:
        reason_parts.append(
            f"adds only {best.schedule_delta_days} days vs baseline"
        )

    reason_parts.append(f"risk level is {best.risk_level}")

    return best.label, f"{best.label} is recommended: it {' and '.join(reason_parts)}."


def compare_scenarios(request: ComparisonRequest) -> ComparisonResult:
    """
    Main entry point for decision comparison.

    Steps:
    1. Separate baseline from other scenarios.
    2. Compute baseline metrics.
    3. Run each non-baseline scenario through simulation.
    4. Collect all metrics.
    5. Pick the best plan.
    6. Return ComparisonResult.
    """
    project_id = request.project_id or "MOCK-PROJECT-001"

    if not request.scenarios:
        raise ValueError("At least one scenario is required.")

    # First scenario is always treated as baseline
    baseline_input = request.scenarios[0]
    baseline = _get_baseline_metrics(project_id, baseline_input.label)

    all_metrics: list[ScenarioMetrics] = [baseline]

    # Run every other scenario
    for scenario in request.scenarios[1:]:
        if scenario.scenario_type == "baseline":
            # Another baseline — just compute raw metrics
            metrics = _get_baseline_metrics(project_id, scenario.label)
        else:
            metrics = _run_scenario_metrics(scenario, project_id, baseline)
        all_metrics.append(metrics)

    recommended_label, recommendation_reason = _pick_best_plan(
        all_metrics, baseline_input.label
    )

    return ComparisonResult(
        project_id=project_id,
        baseline_label=baseline_input.label,
        scenarios=all_metrics,
        recommended_plan=recommended_label,
        recommendation_reason=recommendation_reason
    )
