"""
api/v1/comparison.py
--------------------
POST /api/v1/compare

Accepts a ComparisonRequest with multiple scenarios,
runs each through the simulation engine,
returns a side-by-side ComparisonResult with a recommended plan.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.comparison import ComparisonRequest, ComparisonResult
from app.services.decision_comparison import compare_scenarios

router = APIRouter(prefix="/compare", tags=["Decision Comparison"])


@router.post("/", response_model=ComparisonResult)
def compare(request: ComparisonRequest):
    """
    Compare multiple project execution scenarios side by side.

    The **first scenario** in the list is always treated as the baseline.
    All other scenarios are compared against it.

    Returns metrics per scenario (finish date, effort, risk, critical path)
    and a recommended plan with reasoning.
    """
    try:
        return compare_scenarios(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@router.get("/health")
def comparison_health():
    """Quick health check for the decision comparison engine."""
    return {"status": "ok", "engine": "decision_comparison"}
