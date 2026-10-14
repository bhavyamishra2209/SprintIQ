"""Unit and integration tests for Decision Comparison multi-scenario planning."""

import pytest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.demo_seed import DEMO_PROJECT_ID, seed_demo_data
from app.repositories.in_memory import get_in_memory_store
from app.schemas.decision import (
    CommitPlanRequest,
    CustomScenarioRequest,
    DecisionComparisonResponse,
)


@pytest.fixture(autouse=True)
async def setup_demo():
    """Ensure in-memory store is reset and populated with demo seed."""
    store = get_in_memory_store()
    store.clear()
    await seed_demo_data(store)


@pytest.mark.asyncio
async def test_get_decision_comparison_returns_complete_multi_scenario_matrix():
    """Verify GET /twin/projects/{id}/decision-comparison computes baseline and trade-off plans."""
    client = TestClient(app)
    response = client.get(f"/twin/projects/{DEMO_PROJECT_ID}/decision-comparison")
    assert response.status_code == 200

    data = response.json()
    assert data["project_id"] == str(DEMO_PROJECT_ID)
    assert len(data["project_name"]) > 0

    plans = data["plans"]
    assert len(plans) >= 4  # baseline, plan_rebalance, plan_concurrency, plan_scope, plan_capacity

    # Verify baseline plan
    baseline = next((p for p in plans if p["id"] == "baseline"), None)
    assert baseline is not None
    assert baseline["metrics"]["finish_days_delta"] == 0
    assert baseline["metrics"]["cost_delta_inr"] == 0.0
    assert baseline["metrics"]["total_effort_hours"] > 0
    assert baseline["metrics"]["total_cost_inr"] > 0
    assert 0.0 <= baseline["metrics"]["on_time_probability_pct"] <= 100.0

    # Verify candidate plans
    rec_count = sum(1 for p in plans if p["is_recommended"])
    assert rec_count == 1  # exactly one recommended plan

    for p in plans:
        m = p["metrics"]
        assert len(m["finish_date"]) > 0
        assert 1.0 <= m["composite_score"] <= 5.0
        assert 1 <= m["composite_stars"] <= 5
        assert 0.0 <= m["team_balance_score"] <= 100.0

    # Verify insights and executive brief
    assert len(data["insights"]) >= 3
    assert len(data["executive_brief"]) > 50
    assert "Executive Decision Brief" in data["executive_brief"]


@pytest.mark.asyncio
async def test_commit_plan_applies_actions_to_digital_twin():
    """Verify POST /twin/projects/{id}/decision-comparison/commit atomically persists plan actions."""
    client = TestClient(app)

    # 1. First fetch comparison to get plan_rebalance
    comp_res = client.get(f"/twin/projects/{DEMO_PROJECT_ID}/decision-comparison")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    rebalance_plan = next((p for p in comp_data["plans"] if p["id"] == "plan_rebalance"), None)
    assert rebalance_plan is not None

    # 2. Commit plan_rebalance
    commit_res = client.post(
        f"/twin/projects/{DEMO_PROJECT_ID}/decision-comparison/commit",
        json={"plan_id": "plan_rebalance"},
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["success"] is True
    assert commit_data["plan_id"] == "plan_rebalance"
    assert commit_data["actions_applied_count"] >= 1
    assert 0.0 <= commit_data["new_balance_score"] <= 100.0

    # 3. Committing baseline should succeed with 0 actions
    base_commit = client.post(
        f"/twin/projects/{DEMO_PROJECT_ID}/decision-comparison/commit",
        json={"plan_id": "baseline"},
    )
    assert base_commit.status_code == 200
    assert base_commit.json()["actions_applied_count"] == 0


@pytest.mark.asyncio
async def test_simulate_custom_scenario_dynamically_evaluates_what_if():
    """Verify POST /twin/projects/{id}/decision-comparison/simulate-custom evaluates interactive sandbox."""
    client = TestClient(app)
    custom_payload = {
        "additional_dev_capacity_hours": 80.0,
        "contractor_hourly_rate_inr": 2200.0,
        "defer_task_ids": [],
        "reassignments": [],
    }
    response = client.post(
        f"/twin/projects/{DEMO_PROJECT_ID}/decision-comparison/simulate-custom",
        json=custom_payload,
    )
    assert response.status_code == 200
    custom_plan = response.json()

    assert custom_plan["id"] == "custom_scenario"
    assert custom_plan["metrics"]["finish_days_delta"] < 0  # Accelerated by extra capacity
    assert custom_plan["metrics"]["cost_delta_inr"] > 0     # Added contractor cost
    assert custom_plan["metrics"]["composite_score"] >= 1.0
