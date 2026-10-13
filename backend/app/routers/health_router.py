"""Health check router for SprintIQ."""

from typing import Any
from fastapi import APIRouter, Depends, status

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Application health check",
)
async def health(settings: Settings = Depends(get_settings)) -> dict[str, Any]:
    """Return application operational status and current active backend modes."""
    return {
        "status": "ok",
        "storage_backend": settings.STORAGE_BACKEND,
        "jira_mock": settings.JIRA_USE_MOCK,
    }
