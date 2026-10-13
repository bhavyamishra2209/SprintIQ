"""SprintIQ FastAPI main application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import setup_exception_handlers
from app.repositories.demo_seed import seed_demo_data
from app.routers.health_router import router as health_router
from app.routers.jira_router import router as jira_router
from app.routers.twin_router import router as twin_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager to seed in-memory store at startup."""
    settings = get_settings()
    if settings.STORAGE_BACKEND == "memory":
        await seed_demo_data(settings=settings)
    yield


app = FastAPI(
    title="SprintIQ API",
    description="Intelligent software project planning & digital twin decision-support system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Custom Exception Handlers
setup_exception_handlers(app)

# Register Routers
app.include_router(health_router)
app.include_router(jira_router)
app.include_router(twin_router)


@app.get("/")
def root():
    """Root endpoint verifying backend availability."""
    return {"message": "SprintIQ Backend is running"}