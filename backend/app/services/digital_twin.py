"""Digital Twin service for dependency graph construction and topological analysis."""

import itertools
import logging
from typing import Optional, Protocol, runtime_checkable
from uuid import UUID

import networkx as nx

from app.core.errors import ProjectNotFoundError
from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.schemas.domain import Dependency, Developer, Sprint, Task
from app.schemas.graph import DependencyEdge, GraphSchema, TaskNode

logger = logging.getLogger(__name__)


@runtime_checkable
class GraphProvider(Protocol):
    """Protocol for components providing project dependency graphs."""

    async def get_dependency_graph(self, project_id: UUID) -> GraphSchema:
        """Construct and return the dependency graph for a project."""
        ...


class DigitalTwinService(GraphProvider):
    """Constructs and queries the project digital twin dependency graph using NetworkX."""

    def __init__(
        self,
        task_repo: TaskRepositoryProtocol,
        dependency_repo: DependencyRepositoryProtocol,
        project_repo: ProjectRepositoryProtocol,
        developer_repo: DeveloperRepositoryProtocol,
        sprint_repo: SprintRepositoryProtocol,
    ) -> None:
        self.task_repo = task_repo
        self.dependency_repo = dependency_repo
        self.project_repo = project_repo
        self.developer_repo = developer_repo
        self.sprint_repo = sprint_repo

    def _build_nx_graph(
        self,
        tasks: list[Task],
        dependencies: list[Dependency],
    ) -> tuple[nx.DiGraph, list[str]]:
        """Construct an internal NetworkX DiGraph without exposing NetworkX outside."""
        G = nx.DiGraph()
        warnings: list[str] = []

        # 1. Add nodes
        for task in tasks:
            task_id = str(task.id)
            # Done tasks have zero remaining duration for critical path scheduling
            duration = 0.0 if task.status == "done" else float(task.estimate_hours or 0.0)
            G.add_node(task_id, task=task, duration=duration)

        # 2. Add edges
        for dep in dependencies:
            u = str(dep.from_task_id)
            v = str(dep.to_task_id)

            # Skip self-loops
            if u == v:
                continue

            # Drop edges pointing to nonexistent tasks with a warning
            if u not in G or v not in G:
                missing = u if u not in G else v
                warnings.append(
                    f"Dependency edge between {u} and {v} dropped: task {missing} not in project"
                )
                continue

            G.add_edge(u, v, type=dep.type, tag=dep.tag)

        return G, warnings

    async def _load_graph_data(
        self, project_id: UUID
    ) -> tuple[list[Task], list[Dependency], dict[UUID, str], dict[UUID, str]]:
        project = await self.project_repo.get_project(project_id)
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        tasks = await self.task_repo.get_tasks(project_id)
        dependencies = await self.dependency_repo.get_dependencies(project_id)
        developers = await self.developer_repo.get_developers(project_id)
        sprints = await self.sprint_repo.get_sprints(project_id)

        dev_names = {d.id: d.display_name for d in developers}
        sprint_names = {s.id: s.name for s in sprints}

        return tasks, dependencies, dev_names, sprint_names

    async def get_dependency_graph(self, project_id: UUID) -> GraphSchema:
        """Build and compute the digital twin dependency graph."""
        tasks, dependencies, dev_names, sprint_names = await self._load_graph_data(project_id)
        G, warnings = self._build_nx_graph(tasks, dependencies)

        # Edge case: empty project
        if len(G.nodes) == 0:
            return GraphSchema(
                project_id=str(project_id),
                nodes=[],
                edges=[],
                critical_path=[],
                total_duration_hours=0.0,
                has_cycles=False,
                cycles=[],
                warnings=warnings,
            )

        # Cycle detection
        has_cycles = not nx.is_directed_acyclic_graph(G)
        if has_cycles:
            raw_cycles = list(itertools.islice(nx.simple_cycles(G), 10))
            warnings.append("Cycle detected in dependency graph; critical path calculation skipped.")

            task_nodes = [
                TaskNode(
                    id=str(t.id),
                    key=t.jira_issue_key,
                    title=t.title,
                    status=t.status,
                    assignee_name=dev_names.get(t.assignee_id) if t.assignee_id else None,
                    sprint_name=sprint_names.get(t.sprint_id) if t.sprint_id else None,
                    estimate_hours=t.estimate_hours,
                    is_critical=False,
                    earliest_start_hours=0.0,
                    earliest_finish_hours=float(t.estimate_hours or 0.0),
                )
                for t in tasks
                if str(t.id) in G
            ]

            edges = [
                DependencyEdge(
                    source=u,
                    target=v,
                    type=G[u][v].get("type", "blocks"),
                    tag=G[u][v].get("tag"),
                    is_critical=False,
                )
                for u, v in G.edges
            ]

            return GraphSchema(
                project_id=str(project_id),
                nodes=task_nodes,
                edges=edges,
                critical_path=[],
                total_duration_hours=0.0,
                has_cycles=True,
                cycles=raw_cycles,
                warnings=warnings,
            )

        # DAG: Compute earliest start/finish and critical path via topological dynamic programming
        topo_order = list(nx.topological_sort(G))
        earliest_start: dict[str, float] = {}
        earliest_finish: dict[str, float] = {}
        best_predecessor: dict[str, Optional[str]] = {}

        for node in topo_order:
            preds = list(G.predecessors(node))
            if not preds:
                earliest_start[node] = 0.0
                best_predecessor[node] = None
            else:
                max_finish = -1.0
                best_p: Optional[str] = None
                for p in preds:
                    p_finish = earliest_finish.get(p, 0.0)
                    if p_finish > max_finish:
                        max_finish = p_finish
                        best_p = p
                earliest_start[node] = max(0.0, max_finish)
                best_predecessor[node] = best_p

            node_duration = G.nodes[node]["duration"]
            earliest_finish[node] = earliest_start[node] + node_duration

        # Determine critical path end node
        end_node = max(topo_order, key=lambda n: earliest_finish[n])
        total_duration = earliest_finish[end_node]

        critical_path_nodes: list[str] = []
        curr: Optional[str] = end_node
        while curr is not None:
            critical_path_nodes.append(curr)
            curr = best_predecessor.get(curr)
        critical_path_nodes.reverse()

        critical_nodes_set = set(critical_path_nodes)
        critical_edges_set = {
            (critical_path_nodes[i], critical_path_nodes[i + 1])
            for i in range(len(critical_path_nodes) - 1)
        }

        # Build final schema objects
        task_nodes = [
            TaskNode(
                id=str(t.id),
                key=t.jira_issue_key,
                title=t.title,
                status=t.status,
                assignee_name=dev_names.get(t.assignee_id) if t.assignee_id else None,
                sprint_name=sprint_names.get(t.sprint_id) if t.sprint_id else None,
                estimate_hours=t.estimate_hours,
                is_critical=(str(t.id) in critical_nodes_set),
                earliest_start_hours=earliest_start.get(str(t.id), 0.0),
                earliest_finish_hours=earliest_finish.get(str(t.id), 0.0),
            )
            for t in tasks
            if str(t.id) in G
        ]

        edges = [
            DependencyEdge(
                source=u,
                target=v,
                type=G[u][v].get("type", "blocks"),
                tag=G[u][v].get("tag"),
                is_critical=((u, v) in critical_edges_set),
            )
            for u, v in G.edges
        ]

        return GraphSchema(
            project_id=str(project_id),
            nodes=task_nodes,
            edges=edges,
            critical_path=critical_path_nodes,
            total_duration_hours=total_duration,
            has_cycles=False,
            cycles=[],
            warnings=warnings,
        )

    async def get_downstream_tasks(self, project_id: UUID, task_id: UUID) -> list[str]:
        """Return list of downstream task IDs dependent on the given task."""
        tasks, dependencies, _, _ = await self._load_graph_data(project_id)
        G, _ = self._build_nx_graph(tasks, dependencies)
        t_id = str(task_id)
        if t_id not in G:
            return []
        return sorted(list(nx.descendants(G, t_id)))

    async def get_upstream_tasks(self, project_id: UUID, task_id: UUID) -> list[str]:
        """Return list of upstream prerequisite task IDs for the given task."""
        tasks, dependencies, _, _ = await self._load_graph_data(project_id)
        G, _ = self._build_nx_graph(tasks, dependencies)
        t_id = str(task_id)
        if t_id not in G:
            return []
        return sorted(list(nx.ancestors(G, t_id)))
