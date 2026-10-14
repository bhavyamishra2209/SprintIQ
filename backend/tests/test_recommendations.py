"""Unit and integration tests for the ML Recommendation & Optimization Engine."""

import pytest
from uuid import UUID
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.demo_seed import DEMO_PROJECT_ID, seed_demo_data
from app.repositories.in_memory import get_in_memory_store
from app.schemas.recommendation import (
    ApplyRecommendationRequest,
    ProjectRecommendationResponse,
    RecommendationType,
)


@pytest.fixture(autouse=True)
async def setup_demo():
    """Ensure in-memory store is reset and populated with demo seed."""
    store = get_in_memory_store()
    store.clear()
    await seed_demo_data(store)


@pytest.mark.asyncio
async def test_recommendations_endpoint_returns_complete_payload():
    """Verify GET /twin/projects/{id}/recommendations generates ML scores and Monte Carlo simulation."""
    client = TestClient(app)
    response = client.get(f"/twin/projects/{DEMO_PROJECT_ID}/recommendations")
    assert response.status_code == 200

    data = response.json()
    assert data["project_id"] == str(DEMO_PROJECT_ID)

    # 1. Recommendations items
    recs = data["recommendations"]
    assert len(recs) >= 1
    for r in recs:
        assert "id" in r
        assert r["type"] in ["reassign", "scope", "concurrency"]
        assert len(r["title"]) > 0
        assert "savings" in r
        assert "impact" in r
        assert 1.0 <= r["confidence"] <= 5.0
        assert "why" in r
        assert "assignee" in r["before"]
        assert "assignee" in r["after"]

    # 2. Monte Carlo statistical summary
    mc = data["monte_carlo"]
    assert mc["iterations"] == 1000
    assert mc["nominal_duration_hours"] > 0
    assert mc["mean_duration_hours"] > 0
    assert 0.0 <= mc["on_time_probability_pct"] <= 100.0
    assert mc["risk_level"] in ["Low", "Medium", "High"]

    # 3. ML Task Risk Scores
    task_risks = data["task_risks"]
    assert len(task_risks) == 8  # 8 tasks in demo dataset
    for tr in task_risks:
        assert 0.0 <= tr["risk_score"] <= 1.0
        assert tr["risk_level"] in ["Low", "Medium", "High"]
        assert isinstance(tr["top_risk_factors"], list)
        assert len(tr["top_risk_factors"]) > 0

    # 4. Workload distribution
    workload = data["workload_summary"]
    assert len(workload) == 3  # Alice, Bob, Charlie
    assert 0.0 <= data["overall_balance_score"] <= 100.0


@pytest.mark.asyncio
async def test_apply_recommendation_reassign():
    """Verify POST /twin/projects/{id}/recommendations/apply reassigns task and recalculates workload."""
    client = TestClient(app)

    # First fetch recommendations to find a candidate reassign recommendation
    get_res = client.get(f"/twin/projects/{DEMO_PROJECT_ID}/recommendations")
    assert get_res.status_code == 200
    data = get_res.json()
    reassign_rec = next((r for r in data["recommendations"] if r["type"] == "reassign" and r.get("task_id")), None)

    assert reassign_rec is not None, "At least one reassign recommendation should be generated"

    # Apply the recommendation
    apply_payload = {
        "action_type": "reassign",
        "task_id": reassign_rec["task_id"],
        "new_assignee_id": reassign_rec["to_assignee_id"],
    }
    post_res = client.post(
        f"/twin/projects/{DEMO_PROJECT_ID}/recommendations/apply",
        json=apply_payload,
    )
    assert post_res.status_code == 200
    apply_data = post_res.json()
    assert apply_data["success"] is True
    assert apply_data["action_applied"] == "reassign"
    assert apply_data["updated_task_id"] == reassign_rec["task_id"]
    assert apply_data["new_balance_score"] is not None


@pytest.mark.asyncio
async def test_apply_recommendation_scope_deferral():
    """Verify POST /twin/projects/{id}/recommendations/apply defers a non-critical task."""
    client = TestClient(app)

    # Pick a leaf task like ALPHA-8
    store = get_in_memory_store()
    task = next((t for t in store.tasks.values() if t.jira_issue_key == "ALPHA-8"), None)
    assert task is not None

    apply_payload = {
        "action_type": "scope",
        "task_id": str(task.id),
    }
    res = client.post(
        f"/twin/projects/{DEMO_PROJECT_ID}/recommendations/apply",
        json=apply_payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "deferred" in data["message"].lower()


@pytest.mark.asyncio
async def test_recommendations_nonexistent_project_404():
    """Verify 404 is returned when requesting recommendations for unknown project."""
    client = TestClient(app)
    fake_id = UUID("99999999-9999-9999-9999-999999999999")
    res = client.get(f"/twin/projects/{fake_id}/recommendations")
    assert res.status_code == 404
