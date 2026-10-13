"""Pytest fixtures for SprintIQ backend test suite."""

import pytest
from app.repositories.demo_seed import DEMO_PROJECT_ID, seed_demo_data
from app.repositories.in_memory import InMemoryStore, get_in_memory_store


@pytest.fixture(autouse=True)
def reset_in_memory_store():
    """Ensure in-memory store is clean before each test."""
    store = get_in_memory_store()
    store.clear()
    yield store
    store.clear()


@pytest.fixture
async def seeded_store(reset_in_memory_store):
    """Provide an in-memory store pre-populated with Project Alpha demo seed data."""
    await seed_demo_data(reset_in_memory_store)
    return reset_in_memory_store
