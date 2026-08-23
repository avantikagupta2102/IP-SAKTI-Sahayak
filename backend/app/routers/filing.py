"""Integrated AI filing assistant and IP preparation endpoints."""
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    FilingDraftResponse,
    FilingMessageRequest,
    FilingSessionResponse,
    FilingStartRequest,
    PriorArtSearchRequest,
    PriorArtSearchResponse,
    ReadinessRequest,
    ReadinessResponse,
)
from app.services.filing_assistant import generate_draft, get_profile, next_question, update_profile
from app.services.prior_art import search_prior_art
from app.services.readiness import score_profile

router = APIRouter()


def _session_response(session_id: str, profile, ai_available: bool) -> FilingSessionResponse:
    question, missing, progress = next_question(profile)
    return FilingSessionResponse(session_id=session_id, profile=profile, question=question,
                                 missing_fields=missing, progress=progress, ai_available=ai_available)


@router.post("/filing/start", response_model=FilingSessionResponse)
async def start_filing(request: FilingStartRequest) -> FilingSessionResponse:
    session_id, profile, available = update_profile(None, request.description)
    return _session_response(session_id, profile, available)


@router.post("/filing/message", response_model=FilingSessionResponse)
async def filing_message(request: FilingMessageRequest) -> FilingSessionResponse:
    if not get_profile(request.session_id):
        raise HTTPException(status_code=404, detail="Filing session not found. Start a new filing session first.")
    session_id, profile, available = update_profile(request.session_id, request.message)
    return _session_response(session_id, profile, available)


@router.get("/filing/{session_id}", response_model=FilingSessionResponse)
async def filing_session(session_id: str) -> FilingSessionResponse:
    profile = get_profile(session_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Filing session not found.")
    return _session_response(session_id, profile, True)


@router.post("/filing/{session_id}/generate-draft", response_model=FilingDraftResponse)
async def filing_draft(session_id: str) -> FilingDraftResponse:
    profile = get_profile(session_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Filing session not found.")
    return generate_draft(session_id, profile)


@router.post("/prior-art/search", response_model=PriorArtSearchResponse)
async def prior_art_search(request: PriorArtSearchRequest) -> PriorArtSearchResponse:
    try:
        return search_prior_art(request.profile, request.top_k)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Similarity search is temporarily unavailable. Please try again.") from exc


@router.post("/readiness/score", response_model=ReadinessResponse)
async def readiness_score(request: ReadinessRequest) -> ReadinessResponse:
    return score_profile(request.profile, draft_present=request.draft is not None,
                         prior_art_results=request.prior_art_results)
