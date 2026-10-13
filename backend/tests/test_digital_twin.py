"""Unit tests for Digital Twin dependency graph construction and analysis."""

from uuid import uuid4
import pytest

from app.core.errors import ProjectNotFoundError
from app.repositories.in_memory import (
    InMemoryDependencyRepository,
    InMemoryDeveloperRepository,
    InMemoryProjectRepository,
    InMemorySprintRepository,
    InMemoryStore,
    InMemoryTaskRepository,
)
from app.schemas.domain import Dependency, Developer, Project, Sprint, Task
from app.services.digital_twin import DigitalTwinService


@pytest.mark.asyncio
async def test_digital_twin_dag_critical_path_known_answer():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Test Project"))

    # Tasks: A (10h), B (20h), C (15h), D (5h)
    # A -> B -> D (10 + 20 + 5 = 35h) [CRITICAL]
    # A -> C -> D (10 + 15 + 5 = 30h)
    task_a = Task(project_id=project_id, jira_issue_key="T-A", title="Task A", status="todo", estimate_hours=10.0)
    task_b = Task(project_id=project_id, jira_issue_key="T-B", title="Task B", status="todo", estimate_hours=20.0)
    task_c = Task(project_id=project_id, jira_issue_key="T-C", title="Task C", status="todo", estimate_hours=15.0)
    task_d = Task(project_id=project_id, jira_issue_key="T-D", title="Task D", status="todo", estimate_hours=5.0)
    await task_repo.upsert_tasks([task_a, task_b, task_c, task_d])

    dep_ab = Dependency(project_id=project_id, from_task_id=task_a.id, to_task_id=task_b.id)
    dep_ac = Dependency(project_id=project_id, from_task_id=task_a.id, to_task_id=task_c.id)
    dep_bd = Dependency(project_id=project_id, from_task_id=task_b.id, to_task_id=task_d.id)
    dep_cd = Dependency(project_id=project_id, from_task_id=task_c.id, to_task_id=task_d.id)
    await dependency_repo.replace_dependencies(project_id, [dep_ab, dep_ac, dep_bd, dep_cd], tag_filter=None)

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    graph = await service.get_dependency_graph(project_id)
    assert not graph.has_cycles
    assert len(graph.cycles) == 0
    assert graph.total_duration_hours == 35.0
    assert graph.critical_path == [str(task_a.id), str(task_b.id), str(task_d.id)]

    node_map = {n.id: n for n in graph.nodes}
    assert node_map[str(task_a.id)].is_critical is True
    assert node_map[str(task_b.id)].is_critical is True
    assert node_map[str(task_c.id)].is_critical is False
    assert node_map[str(task_d.id)].is_critical is True

    # Earliest start/finish checks
    assert node_map[str(task_a.id)].earliest_start_hours == 0.0
    assert node_map[str(task_a.id)].earliest_finish_hours == 10.0
    assert node_map[str(task_b.id)].earliest_start_hours == 10.0
    assert node_map[str(task_b.id)].earliest_finish_hours == 30.0
    assert node_map[str(task_d.id)].earliest_start_hours == 30.0
    assert node_map[str(task_d.id)].earliest_finish_hours == 35.0

    # Critical edges
    edge_map = {(e.source, e.target): e.is_critical for e in graph.edges}
    assert edge_map[(str(task_a.id), str(task_b.id))] is True
    assert edge_map[(str(task_b.id), str(task_d.id))] is True
    assert edge_map[(str(task_a.id), str(task_c.id))] is False
    assert edge_map[(str(task_c.id), str(task_d.id))] is False


@pytest.mark.asyncio
async def test_digital_twin_done_tasks_count_as_zero_duration():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Test Project"))

    # Task A is DONE (10h estimate, but effectively 0h for forward schedule)
    # Task B is TODO (20h)
    task_a = Task(project_id=project_id, jira_issue_key="T-A", title="Task A", status="done", estimate_hours=10.0)
    task_b = Task(project_id=project_id, jira_issue_key="T-B", title="Task B", status="todo", estimate_hours=20.0)
    await task_repo.upsert_tasks([task_a, task_b])

    dep_ab = Dependency(project_id=project_id, from_task_id=task_a.id, to_task_id=task_b.id)
    await dependency_repo.replace_dependencies(project_id, [dep_ab], tag_filter=None)

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    graph = await service.get_dependency_graph(project_id)
    node_map = {n.id: n for n in graph.nodes}
    assert node_map[str(task_a.id)].earliest_start_hours == 0.0
    assert node_map[str(task_a.id)].earliest_finish_hours == 0.0
    assert node_map[str(task_b.id)].earliest_start_hours == 0.0
    assert node_map[str(task_b.id)].earliest_finish_hours == 20.0
    assert graph.total_duration_hours == 20.0


@pytest.mark.asyncio
async def test_digital_twin_cycle_detection_without_crash():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Cycle Project"))

    # Cycle: X -> Y -> Z -> X
    task_x = Task(project_id=project_id, jira_issue_key="T-X", title="Task X", status="todo", estimate_hours=10.0)
    task_y = Task(project_id=project_id, jira_issue_key="T-Y", title="Task Y", status="todo", estimate_hours=10.0)
    task_z = Task(project_id=project_id, jira_issue_key="T-Z", title="Task Z", status="todo", estimate_hours=10.0)
    await task_repo.upsert_tasks([task_x, task_y, task_z])

    dep_xy = Dependency(project_id=project_id, from_task_id=task_x.id, to_task_id=task_y.id)
    dep_yz = Dependency(project_id=project_id, from_task_id=task_y.id, to_task_id=task_z.id)
    dep_zx = Dependency(project_id=project_id, from_task_id=task_z.id, to_task_id=task_x.id)
    await dependency_repo.replace_dependencies(project_id, [dep_xy, dep_yz, dep_zx], tag_filter=None)

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    graph = await service.get_dependency_graph(project_id)
    assert graph.has_cycles is True
    assert len(graph.cycles) >= 1
    assert graph.critical_path == []
    assert graph.total_duration_hours == 0.0
    assert any("Cycle detected" in w for w in graph.warnings)


@pytest.mark.asyncio
async def test_digital_twin_empty_project():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Empty Project"))

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    graph = await service.get_dependency_graph(project_id)
    assert graph.nodes == []
    assert graph.edges == []
    assert graph.has_cycles is False
    assert graph.critical_path == []
    assert graph.total_duration_hours == 0.0


@pytest.mark.asyncio
async def test_digital_twin_downstream_and_upstream_queries():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Queries Project"))

    # Chain: A -> B -> C -> D
    t_a = Task(project_id=project_id, jira_issue_key="A", title="A", status="todo")
    t_b = Task(project_id=project_id, jira_issue_key="B", title="B", status="todo")
    t_c = Task(project_id=project_id, jira_issue_key="C", title="C", status="todo")
    t_d = Task(project_id=project_id, jira_issue_key="D", title="D", status="todo")
    await task_repo.upsert_tasks([t_a, t_b, t_c, t_d])

    deps = [
        Dependency(project_id=project_id, from_task_id=t_a.id, to_task_id=t_b.id),
        Dependency(project_id=project_id, from_task_id=t_b.id, to_task_id=t_c.id),
        Dependency(project_id=project_id, from_task_id=t_c.id, to_task_id=t_d.id),
    ]
    await dependency_repo.replace_dependencies(project_id, deps, tag_filter=None)

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    # Downstream of B is {C, D}
    downstream_b = await service.get_downstream_tasks(project_id, t_b.id)
    assert sorted(downstream_b) == sorted([str(t_c.id), str(t_d.id)])

    # Upstream of C is {A, B}
    upstream_c = await service.get_upstream_tasks(project_id, t_c.id)
    assert sorted(upstream_c) == sorted([str(t_a.id), str(t_b.id)])


@pytest.mark.asyncio
async def test_digital_twin_edge_referencing_missing_task_is_dropped():
    store = InMemoryStore()
    project_repo = InMemoryProjectRepository(store)
    developer_repo = InMemoryDeveloperRepository(store)
    sprint_repo = InMemorySprintRepository(store)
    task_repo = InMemoryTaskRepository(store)
    dependency_repo = InMemoryDependencyRepository(store)

    project_id = uuid4()
    await project_repo.upsert_project(Project(id=project_id, name="Missing Edge Project"))

    t_real = Task(project_id=project_id, jira_issue_key="REAL", title="Real Task", status="todo")
    await task_repo.upsert_tasks([t_real])

    missing_id = uuid4()
    dep_bad = Dependency(project_id=project_id, from_task_id=t_real.id, to_task_id=missing_id)
    await dependency_repo.replace_dependencies(project_id, [dep_bad], tag_filter=None)

    service = DigitalTwinService(
        task_repo=task_repo,
        dependency_repo=dependency_repo,
        project_repo=project_repo,
        developer_repo=developer_repo,
        sprint_repo=sprint_repo,
    )

    graph = await service.get_dependency_graph(project_id)
    assert len(graph.nodes) == 1
    assert len(graph.edges) == 0
    assert any("dropped" in w for w in graph.warnings)
