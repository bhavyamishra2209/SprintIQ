"""
recommendation.py
-----------------
Recommendation & Optimization Engine.

Analyses current workload distribution across developers.
Uses a greedy algorithm to suggest task reassignments that:
  - Reduce overloaded developers' workload
  - Balance the team more evenly
  - Minimise project risk
"""

from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResult,
    ReassignmentSuggestion,
    WorkloadInfo,
)
from app.services.graph_loader import load_graph, build_nx_graph

# Sprint capacity assumption: 8hrs/day x 10 days = 80 hrs per sprint
SPRINT_CAPACITY_HOURS = 80


def _compute_workload(G) -> dict[str, dict]:
    """
    For each developer, compute:
    - total estimated hours of their assigned tasks
    - number of tasks
    - utilization % against sprint capacity
    """
    workload: dict[str, dict] = {}

    for node_id, data in G.nodes(data=True):
        dev = data.get("assignee", "Unassigned")
        if dev not in workload:
            workload[dev] = {"hours": 0, "tasks": [], "task_count": 0}
        workload[dev]["hours"] += data.get("estimate", 0)
        workload[dev]["tasks"].append(node_id)
        workload[dev]["task_count"] += 1

    return workload


def _balance_score(workload: dict[str, dict]) -> float:
    """
    Compute a balance score from 0-100.
    100 = perfectly balanced (all devs have same hours).
    0   = completely unbalanced (one dev has everything).
    """
    hours_list = [v["hours"] for v in workload.values() if v["hours"] > 0]
    if len(hours_list) <= 1:
        return 100.0

    avg = sum(hours_list) / len(hours_list)
    if avg == 0:
        return 100.0

    # Coefficient of variation — lower = more balanced
    variance = sum((h - avg) ** 2 for h in hours_list) / len(hours_list)
    std_dev = variance ** 0.5
    cv = std_dev / avg   # 0 = perfectly balanced

    # Convert to 0-100 score (100 = balanced, 0 = unbalanced)
    score = max(0.0, 100.0 - (cv * 100))
    return round(score, 2)


def generate_recommendations(request: RecommendationRequest) -> RecommendationResult:
    """
    Greedy reassignment algorithm:

    1. Compute workload for every developer.
    2. Find the most overloaded developer (highest hours).
    3. Find the most underloaded developer (lowest hours).
    4. If the gap is significant, suggest moving a task from over → under.
    5. Repeat up to max_suggestions times.
    """
    graph = load_graph(request.project_id)
    G = build_nx_graph(graph)

    # Filter to specific sprint if requested
    if request.target_sprint:
        nodes_in_sprint = [
            n for n, d in G.nodes(data=True)
            if d.get("sprint") == request.target_sprint
        ]
        G = G.subgraph(nodes_in_sprint).copy()

    workload = _compute_workload(G)
    suggestions: list[ReassignmentSuggestion] = []
    used_tasks: set[str] = set()

    for _ in range(request.max_suggestions):
        if len(workload) < 2:
            break

        # Find most and least loaded developers
        active_devs = {d: v for d, v in workload.items() if v["task_count"] > 0}
        if len(active_devs) < 2:
            break

        most_loaded = max(active_devs, key=lambda d: active_devs[d]["hours"])
        least_loaded = min(active_devs, key=lambda d: active_devs[d]["hours"])

        hours_gap = active_devs[most_loaded]["hours"] - active_devs[least_loaded]["hours"]

        # Only suggest if the gap is more than half a day (4 hours)
        if hours_gap < 4:
            break

        # Pick the smallest task from the overloaded dev that hasn't been suggested yet
        # and is not "done"
        candidate_tasks = [
            t for t in active_devs[most_loaded]["tasks"]
            if t not in used_tasks and G.nodes[t].get("status") != "done"
        ]

        if not candidate_tasks:
            break

        # Pick task with smallest estimate to minimise disruption
        task_to_move = min(
            candidate_tasks,
            key=lambda t: G.nodes[t].get("estimate", 0)
        )

        task_data = G.nodes[task_to_move]
        task_hours = task_data.get("estimate", 0)
        hours_saved = task_hours / 2   # approximate saving for overloaded dev

        # Confidence based on how large the imbalance is
        confidence = min(1.0, round(hours_gap / SPRINT_CAPACITY_HOURS, 2))

        suggestions.append(ReassignmentSuggestion(
            task_id=task_to_move,
            task_title=task_data.get("title", task_to_move),
            current_assignee=most_loaded,
            suggested_assignee=least_loaded,
            reason=(
                f"{most_loaded} has {active_devs[most_loaded]['hours']}h assigned "
                f"vs {least_loaded}'s {active_devs[least_loaded]['hours']}h. "
                f"Moving this {task_hours}h task reduces the gap."
            ),
            hours_saved=hours_saved,
            confidence=confidence
        ))

        # Update workload for next iteration
        workload[most_loaded]["hours"] -= task_hours
        workload[most_loaded]["tasks"].remove(task_to_move)
        workload[most_loaded]["task_count"] -= 1
        workload[least_loaded]["hours"] += task_hours
        workload[least_loaded]["tasks"].append(task_to_move)
        workload[least_loaded]["task_count"] += 1
        used_tasks.add(task_to_move)

    # Build workload summary for response
    workload_summary = [
        WorkloadInfo(
            developer=dev,
            current_hours=v["hours"],
            task_count=v["task_count"],
            utilization_pct=round((v["hours"] / SPRINT_CAPACITY_HOURS) * 100, 1)
        )
        for dev, v in workload.items()
    ]

    balance = _balance_score(workload)
    warning = None
    if not suggestions:
        warning = "Team workload is already well balanced — no reassignments needed."

    return RecommendationResult(
        project_id=request.project_id or "MOCK-PROJECT-001",
        workload_summary=workload_summary,
        suggestions=suggestions,
        overall_balance_score=balance,
        warning=warning
    )
