"""Jira integration service, HTTP client, and mock client for SprintIQ."""

import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Optional, Protocol, runtime_checkable
from uuid import UUID

import httpx

from app.core.config import Settings, get_settings
from app.core.errors import (
    ConfigurationError,
    JiraAuthError,
    JiraError,
    JiraNotFoundError,
    ProjectNotFoundError,
)
from app.repositories.base import (
    DependencyRepositoryProtocol,
    DeveloperRepositoryProtocol,
    ProjectRepositoryProtocol,
    SprintRepositoryProtocol,
    TaskRepositoryProtocol,
)
from app.schemas.domain import Dependency, Developer, Sprint, Task
from app.schemas.jira import SyncSummary

logger = logging.getLogger(__name__)


def adf_to_text(adf: Any) -> Optional[str]:
    """Recursively convert Atlassian Document Format (ADF) to plain text."""
    if adf is None:
        return None
    if isinstance(adf, str):
        return adf.strip() or None

    extracted: list[str] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            if node.get("type") == "text" and "text" in node:
                extracted.append(node["text"])
            for val in node.values():
                if isinstance(val, (dict, list)):
                    _walk(val)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(adf)
    text = " ".join("".join(extracted).split())
    return text.strip() if text else None


def _parse_iso(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        clean_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


@runtime_checkable
class JiraClientProtocol(Protocol):
    """Protocol for Jira HTTP client operations."""

    async def get_project(self, project_key: str) -> dict[str, Any]:
        """Fetch project details by key."""
        ...

    async def get_board_sprints(self, board_id: int) -> list[dict[str, Any]]:
        """Fetch sprints for a board."""
        ...

    async def search_issues(self, jql: str, fields: list[str]) -> list[dict[str, Any]]:
        """Search issues using enhanced /rest/api/3/search/jql endpoint."""
        ...

    async def get_project_users(self, project_key: str) -> list[dict[str, Any]]:
        """Fetch assignable users for a project."""
        ...

    async def ping(self) -> dict[str, Any]:
        """Verify Jira credentials and connectivity."""
        ...


class JiraClient(JiraClientProtocol):
    """Async HTTP client for Jira Cloud REST API v3 with retries and backoff."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        api_token: Optional[str] = None,
        http_client: Optional[httpx.AsyncClient] = None,
        max_retries: int = 3,
    ) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.JIRA_BASE_URL or "").rstrip("/")
        self.email = email or settings.JIRA_EMAIL or ""
        self.api_token = api_token or settings.JIRA_API_TOKEN or ""
        self.max_retries = max_retries

        if http_client is not None:
            self._client = http_client
            self._owns_client = False
        else:
            auth = (self.email, self.api_token) if (self.email and self.api_token) else None
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                auth=auth,
                headers={"Accept": "application/json"},
                timeout=30.0,
            )
            self._owns_client = True

    async def close(self) -> None:
        """Close underlying HTTP client if owned."""
        if self._owns_client:
            await self._client.aclose()

    async def _request_with_retry(
        self, method: str, path: str, **kwargs: Any
    ) -> httpx.Response:
        """Perform request with exponential backoff on 429 and 5xx errors."""
        url = path if path.startswith("http") else f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        headers["Accept"] = "application/json"

        last_exc: Optional[Exception] = None
        for attempt in range(self.max_retries):
            try:
                response = await self._client.request(method, url, headers=headers, **kwargs)
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt < self.max_retries - 1:
                        retry_after = response.headers.get("Retry-After")
                        delay = (
                            float(retry_after)
                            if (retry_after and retry_after.isdigit())
                            else (2.0 ** attempt) * 0.5
                        )
                        await asyncio.sleep(delay)
                        continue

                if response.status_code in (401, 403):
                    raise JiraAuthError("Jira authentication failed (401/403)")
                if response.status_code == 404:
                    raise JiraNotFoundError(f"Jira resource not found at {path}")
                if response.is_error:
                    raise JiraError(
                        f"Jira API error {response.status_code}: {response.text[:200]}"
                    )

                return response
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_exc = exc
                if attempt < self.max_retries - 1:
                    await asyncio.sleep((2.0 ** attempt) * 0.5)
                    continue
                raise JiraError(f"Network error communicating with Jira: {exc}") from exc

        if last_exc:
            raise JiraError(f"Max retries exceeded: {last_exc}")
        raise JiraError(f"Request failed to {url}")

    async def get_project(self, project_key: str) -> dict[str, Any]:
        res = await self._request_with_retry("GET", f"/rest/api/3/project/{project_key}")
        return res.json()

    async def get_board_sprints(self, board_id: int) -> list[dict[str, Any]]:
        sprints: list[dict[str, Any]] = []
        start_at = 0
        max_results = 50

        while True:
            res = await self._request_with_retry(
                "GET",
                f"/rest/agile/1.0/board/{board_id}/sprint",
                params={"startAt": start_at, "maxResults": max_results},
            )
            data = res.json()
            values = data.get("values", [])
            sprints.extend(values)

            if data.get("isLast", True) or not values:
                break
            start_at += len(values)

        return sprints

    async def search_issues(self, jql: str, fields: list[str]) -> list[dict[str, Any]]:
        """Enhanced search using /rest/api/3/search/jql with nextPageToken pagination."""
        issues: list[dict[str, Any]] = []
        next_page_token: Optional[str] = None
        fields_param = ",".join(fields)

        while True:
            params: dict[str, Any] = {
                "jql": jql,
                "fields": fields_param,
                "maxResults": 100,
            }
            if next_page_token:
                params["nextPageToken"] = next_page_token

            res = await self._request_with_retry(
                "GET", "/rest/api/3/search/jql", params=params
            )
            data = res.json()
            batch = data.get("values", [])
            issues.extend(batch)

            next_page_token = data.get("nextPageToken")
            if not next_page_token or not batch:
                break

        return issues

    async def get_project_users(self, project_key: str) -> list[dict[str, Any]]:
        users: list[dict[str, Any]] = []
        start_at = 0
        max_results = 50

        while True:
            res = await self._request_with_retry(
                "GET",
                "/rest/api/3/user/assignable/search",
                params={"project": project_key, "startAt": start_at, "maxResults": max_results},
            )
            data = res.json()
            if not isinstance(data, list) or not data:
                break
            users.extend(data)
            if len(data) < max_results:
                break
            start_at += len(data)

        return users

    async def ping(self) -> dict[str, Any]:
        res = await self._request_with_retry("GET", "/rest/api/3/myself")
        return res.json()


class MockJiraClient(JiraClientProtocol):
    """Mock Jira client reading offline JSON fixtures for tests and local development."""

    def __init__(self, fixtures_dir: Optional[Path] = None) -> None:
        if fixtures_dir is not None:
            self.fixtures_dir = fixtures_dir
        else:
            base = Path(__file__).resolve().parent.parent.parent
            self.fixtures_dir = base / "tests" / "fixtures"

    def _read_fixture(self, filename: str) -> Any:
        path = self.fixtures_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Fixture file {filename} not found at {path}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    async def get_project(self, project_key: str) -> dict[str, Any]:
        return self._read_fixture("jira_project.json")

    async def get_board_sprints(self, board_id: int) -> list[dict[str, Any]]:
        data = self._read_fixture("jira_sprints.json")
        return data.get("values", [])

    async def search_issues(self, jql: str, fields: list[str]) -> list[dict[str, Any]]:
        data = self._read_fixture("jira_issues.json")
        return data.get("values", [])

    async def get_project_users(self, project_key: str) -> list[dict[str, Any]]:
        return self._read_fixture("jira_users.json")

    async def ping(self) -> dict[str, Any]:
        return {"accountId": "mock-admin-001", "displayName": "Mock Jira Admin"}


class JiraIntegrationService:
    """Orchestration service for synchronizing Jira data with SprintIQ domain entities."""

    def __init__(
        self,
        client: JiraClientProtocol,
        project_repo: ProjectRepositoryProtocol,
        developer_repo: DeveloperRepositoryProtocol,
        sprint_repo: SprintRepositoryProtocol,
        task_repo: TaskRepositoryProtocol,
        dependency_repo: DependencyRepositoryProtocol,
        settings: Optional[Settings] = None,
    ) -> None:
        self.client = client
        self.project_repo = project_repo
        self.developer_repo = developer_repo
        self.sprint_repo = sprint_repo
        self.task_repo = task_repo
        self.dependency_repo = dependency_repo
        self.settings = settings or get_settings()

    async def sync_project(self, project_id: UUID) -> SyncSummary:
        """Synchronize a project's sprints, developers, tasks, and dependency graph."""
        project = await self.project_repo.get_project(project_id)
        if not project:
            raise ProjectNotFoundError(f"Project with ID {project_id} not found")

        project_key = project.jira_project_key
        if not project_key:
            raise ConfigurationError(
                f"Project {project_id} has no jira_project_key configured for synchronization"
            )

        warnings: list[str] = []

        # 1. Synchronize Sprints
        sprint_by_jira_id: dict[int, UUID] = {}
        synced_sprints_count = 0
        if project.jira_board_id is not None:
            raw_sprints = await self.client.get_board_sprints(project.jira_board_id)
            sprint_models: list[Sprint] = []
            for raw_sp in raw_sprints:
                s_id = raw_sp.get("id")
                raw_state = raw_sp.get("state", "future").lower()
                state = raw_state if raw_state in ("future", "active", "closed") else "future"
                sprint_models.append(
                    Sprint(
                        project_id=project_id,
                        jira_sprint_id=s_id,
                        name=raw_sp.get("name", f"Sprint {s_id}"),
                        state=state,
                        start_date=_parse_iso(raw_sp.get("startDate")),
                        end_date=_parse_iso(raw_sp.get("endDate")),
                        goal=raw_sp.get("goal"),
                    )
                )
            if sprint_models:
                upserted_sprints = await self.sprint_repo.upsert_sprints(sprint_models)
                synced_sprints_count = len(upserted_sprints)
                sprint_by_jira_id = {
                    s.jira_sprint_id: s.id for s in upserted_sprints if s.jira_sprint_id
                }

        # Also pull existing sprints to complete lookup if any were already in database
        existing_sprints = await self.sprint_repo.get_sprints(project_id)
        for s in existing_sprints:
            if s.jira_sprint_id and s.jira_sprint_id not in sprint_by_jira_id:
                sprint_by_jira_id[s.jira_sprint_id] = s.id

        # 2. Synchronize Assignable Users / Developers
        raw_users = await self.client.get_project_users(project_key)
        developer_models: list[Developer] = []
        for raw_u in raw_users:
            acc_id = raw_u.get("accountId")
            if not acc_id:
                continue
            developer_models.append(
                Developer(
                    project_id=project_id,
                    jira_account_id=acc_id,
                    display_name=raw_u.get("displayName", "Unnamed Developer"),
                    email=raw_u.get("emailAddress"),
                    is_active=raw_u.get("active", True),
                )
            )
        upserted_devs = await self.developer_repo.upsert_developers(developer_models)
        dev_by_account_id: dict[str, UUID] = {
            d.jira_account_id: d.id for d in upserted_devs if d.jira_account_id
        }

        # 3. Synchronize Issues / Tasks
        fields = [
            "summary",
            "description",
            "status",
            "issuetype",
            "priority",
            "assignee",
            "issuelinks",
            "created",
            "updated",
            "duedate",
            "timeoriginalestimate",
            "parent",
            self.settings.JIRA_STORY_POINTS_FIELD,
            self.settings.JIRA_SPRINT_FIELD,
        ]
        jql = f'project = "{project_key}" ORDER BY created ASC'
        raw_issues = await self.client.search_issues(jql, fields)

        task_models: list[Task] = []
        for issue in raw_issues:
            issue_key = issue.get("key")
            issue_id = issue.get("id")
            f = issue.get("fields", {})

            # Title & Description
            title = f.get("summary") or issue_key or "Untitled Task"
            desc = adf_to_text(f.get("description"))

            # Status mapping
            status_obj = f.get("status") or {}
            raw_status_name = status_obj.get("name", "")
            cat_key = (status_obj.get("statusCategory") or {}).get("key", "").lower()

            if "block" in raw_status_name.lower():
                mapped_status = "blocked"
            elif cat_key == "done":
                mapped_status = "done"
            elif cat_key == "indeterminate":
                mapped_status = "in_progress"
            else:
                mapped_status = "todo"

            # Story Points & Estimate Hours
            sp_raw = f.get(self.settings.JIRA_STORY_POINTS_FIELD)
            story_points: Optional[float] = None
            if sp_raw is not None:
                try:
                    story_points = float(sp_raw)
                except (ValueError, TypeError):
                    story_points = None

            orig_est = f.get("timeoriginalestimate")
            if orig_est is not None:
                try:
                    estimate_hours = float(orig_est) / 3600.0
                except (ValueError, TypeError):
                    estimate_hours = None
            elif story_points is not None:
                estimate_hours = story_points * self.settings.JIRA_HOURS_PER_STORY_POINT
            else:
                estimate_hours = None

            # Assignee
            assignee_obj = f.get("assignee")
            assignee_id = (
                dev_by_account_id.get(assignee_obj.get("accountId")) if assignee_obj else None
            )

            # Sprint mapping (prefer active, else latest)
            sprint_field = f.get(self.settings.JIRA_SPRINT_FIELD)
            mapped_sprint_id: Optional[UUID] = None
            if isinstance(sprint_field, list) and sprint_field:
                active_sprints = [
                    sp for sp in sprint_field if isinstance(sp, dict) and sp.get("state") == "active"
                ]
                chosen = active_sprints[0] if active_sprints else sprint_field[-1]
                if isinstance(chosen, dict):
                    mapped_sprint_id = sprint_by_jira_id.get(chosen.get("id"))
            elif isinstance(sprint_field, dict):
                mapped_sprint_id = sprint_by_jira_id.get(sprint_field.get("id"))

            task_models.append(
                Task(
                    project_id=project_id,
                    jira_issue_key=issue_key,
                    jira_issue_id=issue_id,
                    title=title,
                    description=desc,
                    status=mapped_status,
                    status_category=raw_status_name or None,
                    issue_type=(f.get("issuetype") or {}).get("name"),
                    priority=(f.get("priority") or {}).get("name"),
                    story_points=story_points,
                    estimate_hours=estimate_hours,
                    assignee_id=assignee_id,
                    sprint_id=mapped_sprint_id,
                    due_date=_parse_iso(f.get("duedate")),
                    jira_created_at=_parse_iso(f.get("created")),
                    jira_updated_at=_parse_iso(f.get("updated")),
                )
            )

        upserted_tasks = await self.task_repo.upsert_tasks(task_models)
        task_by_key: dict[str, UUID] = {
            t.jira_issue_key: t.id for t in upserted_tasks if t.jira_issue_key
        }

        # 4. Build Dependency Edges from Issue Links
        dependencies: list[Dependency] = []
        seen_edges: set[tuple[UUID, UUID, str]] = set()

        for issue in raw_issues:
            src_key = issue.get("key")
            src_task_id = task_by_key.get(src_key)
            if not src_task_id:
                continue

            for link in issue.get("fields", {}).get("issuelinks", []):
                type_obj = link.get("type", {})
                type_name = type_obj.get("name", "")
                outward_desc = type_obj.get("outward", "")

                from_key: Optional[str] = None
                to_key: Optional[str] = None

                # Rule 1: "Blocks"
                if type_name.lower() == "blocks":
                    if "outwardIssue" in link:
                        # Current blocks outward
                        from_key = src_key
                        to_key = link["outwardIssue"].get("key")
                    elif "inwardIssue" in link:
                        # Inward blocks current
                        from_key = link["inwardIssue"].get("key")
                        to_key = src_key

                # Rule 2: "Depends" / "Dependency" (target must finish first)
                elif (
                    type_name.lower() in ("depends", "dependency")
                    or "depends on" in outward_desc.lower()
                ):
                    if "outwardIssue" in link:
                        # Current depends on outward -> outward must finish before current
                        from_key = link["outwardIssue"].get("key")
                        to_key = src_key
                    elif "inwardIssue" in link:
                        # Inward depends on current -> current must finish before inward
                        from_key = src_key
                        to_key = link["inwardIssue"].get("key")
                else:
                    # Ignore unrelated link types (e.g. Relates)
                    continue

                if not from_key or not to_key:
                    continue

                # Skip self-links
                if from_key == to_key:
                    continue

                from_task_id = task_by_key.get(from_key)
                to_task_id = task_by_key.get(to_key)

                # Warn and drop if either end is outside this project's synced issues
                if not from_task_id or not to_task_id:
                    missing_key = from_key if not from_task_id else to_key
                    warn_msg = (
                        f"Issue link between {from_key} and {to_key} dropped: "
                        f"issue {missing_key} is not part of project {project_key}"
                    )
                    if warn_msg not in warnings:
                        warnings.append(warn_msg)
                    continue

                edge_tuple = (from_task_id, to_task_id, "blocks")
                if edge_tuple not in seen_edges:
                    seen_edges.add(edge_tuple)
                    dependencies.append(
                        Dependency(
                            project_id=project_id,
                            from_task_id=from_task_id,
                            to_task_id=to_task_id,
                            type="blocks",
                            tag="jira",
                        )
                    )

        # Replace project dependencies tagged 'jira' atomically
        synced_dependencies = await self.dependency_repo.replace_dependencies(
            project_id, dependencies, tag_filter="jira"
        )

        # Update last synced at timestamp
        await self.project_repo.update_last_synced_at(project_id, datetime.now(timezone.utc))

        return SyncSummary(
            project_id=project_id,
            synced_sprints=synced_sprints_count,
            synced_developers=len(upserted_devs),
            synced_tasks=len(upserted_tasks),
            synced_dependencies=len(synced_dependencies),
            warnings=warnings,
        )
