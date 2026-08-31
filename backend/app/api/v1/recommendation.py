"""
api/v1/recommendation.py
------------------------
POST /api/v1/recommend

Accepts a RecommendationRequest, runs the recommendation engine,
returns a RecommendationResult with workload summary and suggestions.
"""

from fastapi import APIRouter, HTTPException
from app.schemas.recommendation import RecommendationRequest, RecommendationResult
from app.services.recommendation import generate_recommendations

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("/", response_model=RecommendationResult)
def recommend(request: RecommendationRequest):
    """
    Generate task reassignment recommendations to balance developer workload.

    Optionally filter by sprint using **target_sprint**.
    Control how many suggestions are returned with **max_suggestions**.

    Returns workload summary per developer and a list of reassignment suggestions.
    """
    try:
        return generate_recommendations(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


@router.get("/health")
def recommendation_health():
    """Quick health check for the recommendation engine."""
    return {"status": "ok", "engine": "recommendation"}
