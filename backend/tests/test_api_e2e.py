"""End-to-end integration tests for SprintIQ FastAPI application."""

from uuid import uuid4
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.repositories.demo_seed import DEMO_PROJECT_ID, seed_demo_data
from app.repositories.in_memory import get_in_memory_store


@pytest.fixture(autouse=True)
async def init_e2e_app():
    """Ensure in-memory store is seeded before e2e tests."""
    store = get_in_memory_store()
    store.clear()
    await seed_demo_data(store)
    yield
    store.clear()


def test_health_endpoint():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["storage_backend"] == "memory"
        assert data["jira_mock"] is True


def test_root_endpoint():
    with TestClient(app) as client:
        res = client.get("/")
        assert res.status_code == 200
        assert res.json() == {"message": "SprintIQ Backend is running"}


def test_e2e_demo_project_sync_and_digital_twin_flow():
    with TestClient(app) as client:
        demo_id_str = str(DEMO_PROJECT_ID)

        # 1. Inspect initial seeded graph
        res_graph_init = client.get(f"/twin/projects/{demo_id_str}/graph")
        assert res_graph_init.status_code == 200
        graph_init = res_graph_init.json()
        assert len(graph_init["nodes"]) == 8
        assert len(graph_init["edges"]) == 8
        assert graph_init["has_cycles"] is False
        assert len(graph_init["critical_path"]) > 0

        # Find task IDs for downstream/upstream queries
        node_key_map = {n["key"]: n["id"] for n in graph_init["nodes"]}
        alpha3_id = node_key_map["ALPHA-3"]
        alpha8_id = node_key_map["ALPHA-8"]

        # 2. Trigger first Jira Sync
        res_sync1 = client.post(f"/jira/projects/{demo_id_str}/sync")
        assert res_sync1.status_code == 200
        sync1 = res_sync1.json()
        assert sync1["project_id"] == demo_id_str
        assert sync1["synced_tasks"] == 8
        assert sync1["synced_dependencies"] == 8
        assert sync1["synced_sprints"] == 2
        assert sync1["synced_developers"] == 3

        # 3. Graph after sync MUST have exactly 8 nodes and 8 edges
        res_graph_after = client.get(f"/twin/projects/{demo_id_str}/graph")
        assert res_graph_after.status_code == 200
        graph_after = res_graph_after.json()
        assert len(graph_after["nodes"]) == 8
        assert len(graph_after["edges"]) == 8
        assert graph_after["has_cycles"] is False
        assert len(graph_after["critical_path"]) > 0

        # 4. Trigger second Jira Sync: MUST CAUSE NO CHANGE (Idempotent)
        res_sync2 = client.post(f"/jira/projects/{demo_id_str}/sync")
        assert res_sync2.status_code == 200
        sync2 = res_sync2.json()
        assert sync2["synced_tasks"] == 8
        assert sync2["synced_dependencies"] == 8

        res_graph_after2 = client.get(f"/twin/projects/{demo_id_str}/graph")
        assert res_graph_after2.status_code == 200
        graph_after2 = res_graph_after2.json()
        assert len(graph_after2["nodes"]) == 8
        assert len(graph_after2["edges"]) == 8

        # 5. Check Jira Status endpoint
        res_status = client.get(f"/jira/projects/{demo_id_str}/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert status_data["task_count"] == 8
        assert status_data["dependency_count"] == 8
        assert status_data["developer_count"] == 3
        assert status_data["sprint_count"] == 2
        assert status_data["last_synced_at"] is not None

        # 6. Check Downstream tasks for ALPHA-3 (Data Schema)
        res_downstream = client.get(f"/twin/projects/{demo_id_str}/tasks/{alpha3_id}/downstream")
        assert res_downstream.status_code == 200
        downstream = res_downstream.json()["downstream"]
        # ALPHA-3 flows into ALPHA-4, ALPHA-5, ALPHA-6, ALPHA-7, ALPHA-8
        assert len(downstream) == 5

        # 7. Check Upstream tasks for ALPHA-8 (Deploy to UAT)
        res_upstream = client.get(f"/twin/projects/{demo_id_str}/tasks/{alpha8_id}/upstream")
        assert res_upstream.status_code == 200
        upstream = res_upstream.json()["upstream"]
        # All 7 prior tasks lead to ALPHA-8
        assert len(upstream) == 7


def test_404_on_nonexistent_project():
    with TestClient(app) as client:
        random_id = str(uuid4())
        res_graph = client.get(f"/twin/projects/{random_id}/graph")
        assert res_graph.status_code == 404

        res_sync = client.post(f"/jira/projects/{random_id}/sync")
        assert res_sync.status_code == 404

        res_status = client.get(f"/jira/projects/{random_id}/status")
        assert res_status.status_code == 404
