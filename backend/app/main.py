import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

# Load variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")

# Connect to Supabase
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

app = FastAPI(
    title="SprintIQ API",
    description="Intelligent Software Project Planning & Decision Support System",
    version="1.0.0"
)

# CORS — allow frontend (React on :5173) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Person B routers ───────────────────────────────────────────────────────────
from app.api.v1.simulation import router as simulation_router
from app.api.v1.recommendation import router as recommendation_router
from app.api.v1.comparison import router as comparison_router

app.include_router(simulation_router,   prefix="/api/v1")
app.include_router(recommendation_router, prefix="/api/v1")
app.include_router(comparison_router,   prefix="/api/v1")
# ──────────────────────────────────────────────────────────────────────────────
# Person A routers will be added here when ready:
# from app.api.v1.jira import router as jira_router
# from app.api.v1.graph import router as graph_router
# from app.api.v1.impact import router as impact_router
# app.include_router(jira_router,   prefix="/api/v1")
# app.include_router(graph_router,  prefix="/api/v1")
# app.include_router(impact_router, prefix="/api/v1")
# ──────────────────────────────────────────────────────────────────────────────


@app.get("/")
def root():
    return {"message": "SprintIQ Backend is running"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/supabase-test")
def supabase_test():
    return {"message": "Supabase connection created successfully"}
