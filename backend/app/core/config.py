"""Application settings and configuration management using pydantic-settings."""

from functools import lru_cache
from typing import Literal, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.errors import ConfigurationError


class Settings(BaseSettings):
    """SprintIQ application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Storage Backend
    STORAGE_BACKEND: Literal["memory", "supabase"] = "memory"

    # Supabase Credentials (optional unless STORAGE_BACKEND == "supabase")
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    # Jira Integration
    JIRA_USE_MOCK: bool = True
    JIRA_BASE_URL: Optional[str] = None
    JIRA_EMAIL: Optional[str] = None
    JIRA_API_TOKEN: Optional[str] = None

    # Jira Fields & Calculations
    JIRA_STORY_POINTS_FIELD: str = "customfield_10016"
    JIRA_SPRINT_FIELD: str = "customfield_10020"
    JIRA_HOURS_PER_STORY_POINT: float = 4.0

    # Environment
    APP_ENV: str = "dev"

    @model_validator(mode="after")
    def validate_backend_configurations(self) -> "Settings":
        """Validate required configuration only when specific modes are selected."""
        if self.STORAGE_BACKEND == "supabase":
            if not self.SUPABASE_URL or not self.SUPABASE_SERVICE_ROLE_KEY:
                raise ConfigurationError(
                    "STORAGE_BACKEND is set to 'supabase' but SUPABASE_URL or "
                    "SUPABASE_SERVICE_ROLE_KEY is not configured."
                )

        if not self.JIRA_USE_MOCK:
            if not self.JIRA_BASE_URL or not self.JIRA_EMAIL or not self.JIRA_API_TOKEN:
                raise ConfigurationError(
                    "JIRA_USE_MOCK is False but JIRA_BASE_URL, JIRA_EMAIL, or "
                    "JIRA_API_TOKEN is not configured."
                )

        return self


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
