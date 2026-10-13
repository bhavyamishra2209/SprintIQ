"""Lazy initialization and factory for the Supabase client."""

from typing import Optional
from supabase import Client, create_client

from app.core.config import get_settings
from app.core.errors import ConfigurationError

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return the Supabase client instance lazily on first access.

    Raises ConfigurationError if called when Supabase credentials are missing.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    settings = get_settings()
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ConfigurationError(
            "Cannot connect to Supabase: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured."
        )

    _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase_client


def reset_supabase_client() -> None:
    """Reset the cached client instance (primarily for testing)."""
    global _supabase_client
    _supabase_client = None
