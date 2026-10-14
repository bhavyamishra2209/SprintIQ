"""FastAPI router for Digital Twin dependency graph operations."""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, status

from app.dependencies import get_digital_twin_service, get_sprint_repository
from app.repositories.base import SprintRepositoryProtocol
from app.schemas.graph import GraphSchema
from app.services.digital_twin import DigitalTwinService

router = APIRouter(prefix="/twin", tags=["digital-twin"])


@router.get(
    "/projects/{project_id}/sprints",
    response_model=list[dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get project sprints",
)
async def get_project_sprints(
    project_id: UUID,
    sprint_repo: SprintRepositoryProtocol = Depends(get_sprint_repository),
) -> list[dict[str, Any]]:
    """Return all agile sprints synced for the project."""
    sprints = await sprint_repo.get_sprints(project_id)
    return [
        {
            "id": str(s.id),
            "jira_sprint_id": s.jira_sprint_id,
            "name": s.name,
            "state": s.state,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "goal": s.goal,
        }
        for s in sprints
    ]


@router.get(
    "/projects/{project_id}/graph",
    response_model=GraphSchema,
    status_code=status.HTTP_200_OK,
    summary="Get complete project dependency graph",
)
async def get_project_graph(
    project_id: UUID,
    twin_service: DigitalTwinService = Depends(get_digital_twin_service),
) -> GraphSchema:
    """Return the dependency graph including nodes, edges, cycle status, and critical path."""
    return await twin_service.get_dependency_graph(project_id)


@router.get(
    "/projects/{project_id}/tasks/{task_id}/downstream",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get downstream dependent tasks",
)
async def get_downstream_tasks(
    project_id: UUID,
    task_id: UUID,
    twin_service: DigitalTwinService = Depends(get_digital_twin_service),
) -> dict[str, Any]:
    """Return all downstream task IDs that depend directly or indirectly on the given task."""
    downstream = await twin_service.get_downstream_tasks(project_id, task_id)
    return {
        "task_id": str(task_id),
        "downstream": downstream,
    }


@router.get(
    "/projects/{project_id}/tasks/{task_id}/upstream",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get upstream prerequisite tasks",
)
async def get_upstream_tasks(
    project_id: UUID,
    task_id: UUID,
    twin_service: DigitalTwinService = Depends(get_digital_twin_service),
) -> dict[str, Any]:
    """Return all upstream task IDs that must finish before the given task can proceed."""
    upstream = await twin_service.get_upstream_tasks(project_id, task_id)
    return {
        "task_id": str(task_id),
        "upstream": upstream,
    }
