"""
api/v1/simulation.py
--------------------
POST /api/v1/simulate

Accepts a SimulationRequest, runs the simulation engine,
returns a SimulationResult.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.simulation import SimulationRequest, SimulationResult
from app.services.simulation import run_simulation

router = APIRouter(prefix="/simulate", tags=["Simulation"])


@router.post("/", response_model=SimulationResult)
def simulate(request: SimulationRequest):
    """
    Run a what-if simulation scenario.

    Scenario types:
    - **developer_absence**: Simulate a developer being unavailable for N days.
    - **task_delay**: Simulate a specific task being delayed by N days.

    Returns affected tasks, new project timeline, critical path, and risk level.
    """
    try:
        return run_simulation(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/health")
def simulation_health():
    """Quick health check for the simulation engine."""
    return {"status": "ok", "engine": "simulation"}
