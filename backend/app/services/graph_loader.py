"""
graph_loader.py
---------------
Loads the project graph and builds a NetworkX DiGraph from it.

Right now: reads from mock_graph.json
Later:     swap load_graph() to call Person A's /graph endpoint instead.
           Nothing else in your code needs to change.
"""

import json
import os
import networkx as nx
from app.schemas.graph import GraphResponse, GraphNode, GraphEdge

# Path to the mock graph file
MOCK_GRAPH_PATH = os.path.join(
    os.path.dirname(__file__), "..", "mocks", "mock_graph.json"
)


def load_graph(project_id: str = "MOCK-PROJECT-001") -> GraphResponse:
    """
    Load and return the GraphResponse object.
    Currently reads from mock_graph.json.
    When Person A's endpoint is ready, replace this with an HTTP call.
    """
    with open(MOCK_GRAPH_PATH, "r") as f:
        data = json.load(f)
    return GraphResponse(**data)


def build_nx_graph(graph: GraphResponse) -> nx.DiGraph:
    """
    Convert a GraphResponse into a NetworkX DiGraph.

    Nodes carry task attributes as node data.
    Edges represent dependencies (from_node blocks to_node).

    Example:
        T-01 --> T-03 means T-01 must finish before T-03 can start.
    """
    G = nx.DiGraph()

    # Add nodes with all task attributes
    for node in graph.nodes:
        G.add_node(
            node.id,
            title=node.title,
            status=node.status,
            assignee=node.assignee,
            estimate=node.estimate,
            sprint=node.sprint
        )

    # Add edges (dependency direction)
    for edge in graph.edges:
        G.add_edge(edge.from_node, edge.to_node, type=edge.type)

    return G


def get_critical_path(G: nx.DiGraph) -> list[str]:
    """
    Find the critical path through the dependency graph.
    Critical path = longest path by total estimated hours.
    Returns a list of task IDs in order.
    """
    if not nx.is_directed_acyclic_graph(G):
        return []   # cyclic graph — can't compute critical path

    # Find the path with the maximum total estimated hours
    try:
        path = nx.dag_longest_path(G, weight="estimate")
        return path
    except Exception:
        return []


def get_downstream_tasks(G: nx.DiGraph, task_id: str) -> list[str]:
    """
    Return all task IDs that are downstream of (depend on) the given task.
    Uses graph descendants — every task that can't start until task_id finishes.
    """
    if task_id not in G:
        return []
    return list(nx.descendants(G, task_id))
