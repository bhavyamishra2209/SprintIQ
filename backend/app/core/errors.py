"""Custom domain exceptions and FastAPI exception handler registration."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class SprintIQError(Exception):
    """Base exception for SprintIQ errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ConfigurationError(SprintIQError):
    """Raised when environment configuration is missing or invalid."""


class RepositoryError(SprintIQError):
    """Raised when an underlying database or repository operation fails."""


class ProjectNotFoundError(SprintIQError):
    """Raised when a requested project cannot be found."""


class JiraError(SprintIQError):
    """Base exception for Jira API errors."""


class JiraAuthError(JiraError):
    """Raised when Jira authentication fails (401 or 403)."""


class JiraNotFoundError(JiraError):
    """Raised when a Jira resource is not found (404)."""


def setup_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers with the FastAPI application."""

    @app.exception_handler(ProjectNotFoundError)
    async def project_not_found_handler(request: Request, exc: ProjectNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": exc.message, "error": "ProjectNotFound"},
        )

    @app.exception_handler(JiraNotFoundError)
    async def jira_not_found_handler(request: Request, exc: JiraNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": exc.message, "error": "JiraNotFound"},
        )

    @app.exception_handler(JiraAuthError)
    async def jira_auth_error_handler(request: Request, exc: JiraAuthError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"detail": "Jira auth failed", "error": "JiraAuthError"},
        )

    @app.exception_handler(JiraError)
    async def jira_error_handler(request: Request, exc: JiraError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"detail": exc.message, "error": "JiraError"},
        )

    @app.exception_handler(ConfigurationError)
    async def configuration_error_handler(request: Request, exc: ConfigurationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": exc.message, "error": "ConfigurationError"},
        )

    @app.exception_handler(RepositoryError)
    async def repository_error_handler(request: Request, exc: RepositoryError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": exc.message, "error": "RepositoryError"},
        )
