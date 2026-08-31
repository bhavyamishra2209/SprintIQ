"""
simulation.py
-------------
What-If Simulation Engine.

Takes a scenario (developer absence OR task delay), loads the graph,
propagates the effect through the dependency chain, and returns
a SimulationResult with affected tasks + new timeline.
"""

import copy
import networkx as nx
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResult,
    AffectedTask,
)
from app.services.graph_loader import load_graph, build_nx_graph, get_critical_path

# Assume 8 working hours per day
HOURS_PER_DAY = 8


def _compute_project_duration(G: nx.DiGraph) -> float:
    """
    Estimate total project duration in days based on the critical path.
    Sum of estimates along the longest path, divided by hours per day.
    """
    if not nx.is_directed_acyclic_graph(G):
        return 0.0
    try:
        path = nx.dag_longest_path(G, weight="estimate")
        total_hours = sum(G.nodes[n]["estimate"] for n in path)
        return round(total_hours / HOURS_PER_DAY, 2)
    except Exception:
        return 0.0


def _get_other_developer(G: nx.DiGraph, excluded: str) -> str:
    """
    Find another available developer to reassign tasks to.
    Picks the developer with the least total estimated hours currently.
    """
    workload: dict[str, int] = {}
    for node_id, data in G.nodes(data=True):
        dev = data.get("assignee", "")
        if dev and dev != excluded:
            workload[dev] = workload.get(dev, 0) + data.get("estimate", 0)

    if not workload:
        return "Unassigned"

    # Return the developer with the lowest current workload
    return min(workload, key=lambda d: workload[d])


def simulate_developer_absence(request: SimulationRequest) -> SimulationResult:
    """
    Scenario: A developer is absent for N days.

    What happens:
    1. Find all tasks assigned to that developer that are not yet done.
    2. Reassign them to the least-loaded available developer.
    3. Add delay (absence_days) to each reassigned task.
    4. Propagate delays downstream through dependency edges.
    5. Recalculate the critical path and project duration.
    """
    graph = load_graph(request.project_id)
    G = build_nx_graph(graph)
    original_duration = _compute_project_duration(G)

    params = request.developer_absence
    absent_dev = params.developer_name
    absence_days = params.absence_days
    absence_hours = absence_days * HOURS_PER_DAY

    affected: list[AffectedTask] = []
    reassigned_to = _get_other_developer(G, absent_dev)

    # Step 1: Find tasks assigned to the absent developer (not done)
    tasks_to_reassign = [
        n for n, d in G.nodes(data=True)
        if d.get("assignee") == absent_dev and d.get("status") != "done"
    ]

    # Step 2: Reassign and add delay to each affected task
    for task_id in tasks_to_reassign:
        data = G.nodes[task_id]
        original_estimate = data["estimate"]
        new_estimate = original_estimate + absence_hours

        # Update the graph node so downstream propagation uses new estimate
        G.nodes[task_id]["assignee"] = reassigned_to
        G.nodes[task_id]["estimate"] = new_estimate

        affected.append(AffectedTask(
            task_id=task_id,
            title=data["title"],
            original_assignee=absent_dev,
            new_assignee=reassigned_to,
            original_estimate=original_estimate,
            new_estimate=new_estimate,
            delay_added_days=float(absence_days),
            reason=f"{absent_dev} absent for {absence_days} days; task reassigned to {reassigned_to}"
        ))

    # Step 3: Propagate delay to downstream tasks
    already_affected = {t.task_id for t in affected}
    for task_id in tasks_to_reassign:
        downstream = list(nx.descendants(G, task_id))
        for ds_task in downstream:
            if ds_task not in already_affected:
                data = G.nodes[ds_task]
                affected.append(AffectedTask(
                    task_id=ds_task,
                    title=data["title"],
                    original_assignee=data["assignee"],
                    new_assignee=None,
                    original_estimate=data["estimate"],
                    new_estimate=None,
                    delay_added_days=float(absence_days),
                    reason=f"Downstream of reassigned task; delayed by {absence_days} days"
                ))
                already_affected.add(ds_task)

    # Step 4: Recalculate duration and critical path
    new_duration = _compute_project_duration(G)
    critical_path = get_critical_path(G)

    schedule_impact = round(new_duration - original_duration, 2)
    risk = "low" if schedule_impact <= 2 else "medium" if schedule_impact <= 5 else "high"

    return SimulationResult(
        scenario_type="developer_absence",
        scenario_description=f"{absent_dev} absent for {absence_days} days",
        affected_tasks=affected,
        original_finish_days=original_duration,
        new_finish_days=new_duration,
        schedule_impact_days=schedule_impact,
        critical_path=critical_path,
        risk_level=risk
    )


def simulate_task_delay(request: SimulationRequest) -> SimulationResult:
    """
    Scenario: A specific task is delayed by N days.

    What happens:
    1. Add delay_days to the target task's estimate.
    2. Propagate the delay to all downstream tasks.
    3. Recalculate critical path and project duration.
    """
    graph = load_graph(request.project_id)
    G = build_nx_graph(graph)
    original_duration = _compute_project_duration(G)

    params = request.task_delay
    task_id = params.task_id
    delay_days = params.delay_days
    delay_hours = delay_days * HOURS_PER_DAY

    if task_id not in G:
        raise ValueError(f"Task {task_id} not found in graph")

    affected: list[AffectedTask] = []

    # Step 1: Apply delay to target task
    data = G.nodes[task_id]
    original_estimate = data["estimate"]
    new_estimate = original_estimate + delay_hours
    G.nodes[task_id]["estimate"] = new_estimate

    affected.append(AffectedTask(
        task_id=task_id,
        title=data["title"],
        original_assignee=data["assignee"],
        new_assignee=None,
        original_estimate=original_estimate,
        new_estimate=new_estimate,
        delay_added_days=float(delay_days),
        reason=f"Task directly delayed by {delay_days} days"
    ))

    # Step 2: Propagate to downstream tasks
    downstream = list(nx.descendants(G, task_id))
    for ds_task in downstream:
        ds_data = G.nodes[ds_task]
        affected.append(AffectedTask(
            task_id=ds_task,
            title=ds_data["title"],
            original_assignee=ds_data["assignee"],
            new_assignee=None,
            original_estimate=ds_data["estimate"],
            new_estimate=None,
            delay_added_days=float(delay_days),
            reason=f"Downstream of delayed task {task_id}"
        ))

    # Step 3: Recalculate
    new_duration = _compute_project_duration(G)
    critical_path = get_critical_path(G)
    schedule_impact = round(new_duration - original_duration, 2)
    risk = "low" if schedule_impact <= 2 else "medium" if schedule_impact <= 5 else "high"

    return SimulationResult(
        scenario_type="task_delay",
        scenario_description=f"Task {task_id} delayed by {delay_days} days",
        affected_tasks=affected,
        original_finish_days=original_duration,
        new_finish_days=new_duration,
        schedule_impact_days=schedule_impact,
        critical_path=critical_path,
        risk_level=risk
    )


def run_simulation(request: SimulationRequest) -> SimulationResult:
    """Entry point — routes to the right simulation based on scenario_type."""
    if request.scenario_type == "developer_absence":
        if not request.developer_absence:
            raise ValueError("developer_absence params required for this scenario type")
        return simulate_developer_absence(request)

    elif request.scenario_type == "task_delay":
        if not request.task_delay:
            raise ValueError("task_delay params required for this scenario type")
        return simulate_task_delay(request)

    else:
        raise ValueError(f"Unknown scenario type: {request.scenario_type}")
