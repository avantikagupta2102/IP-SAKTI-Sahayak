"""
routers/calendar.py — CRUD endpoints for Compliance Deadline Events.

Endpoints:
  - POST   /api/calendar/event       : Create a new compliance deadline event
  - GET    /api/calendar/event       : List events (with optional profile_id / status filter)
  - GET    /api/calendar/event/{id}  : Get single event by ID
  - PATCH  /api/calendar/event/{id}  : Update event details or status
  - DELETE /api/calendar/event/{id}  : Delete event by ID
"""
import logging
import uuid
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import ComplianceEvent
from app.models.schemas import (
    CalendarEventsResponse,
    ComplianceEventCreate,
    ComplianceEventResponse,
    ComplianceEventUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _evaluate_event_status(evt: ComplianceEvent) -> str:
    """Helper to check if an UPCOMING event has passed its due_date and mark it OVERDUE."""
    if evt.status == "DONE":
        return "DONE"

    try:
        today_str = date.today().isoformat()
        if evt.due_date < today_str and evt.status == "UPCOMING":
            return "OVERDUE"
    except Exception:
        pass

    return evt.status


def _to_response(evt: ComplianceEvent) -> ComplianceEventResponse:
    """Helper to convert ORM model to Pydantic response."""
    computed_status = _evaluate_event_status(evt)
    return ComplianceEventResponse(
        id=evt.id,
        profile_id=evt.profile_id,
        title=evt.title,
        category=evt.category,
        due_date=evt.due_date,
        status=computed_status,
        description=evt.description,
        authority=evt.authority,
        created_at=evt.created_at.isoformat() if evt.created_at else datetime.utcnow().isoformat(),
        updated_at=evt.updated_at.isoformat() if evt.updated_at else datetime.utcnow().isoformat(),
    )


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------


@router.post("/calendar/event", response_model=ComplianceEventResponse, status_code=status.HTTP_201_CREATED, summary="Create Compliance Deadline Event")
async def create_event(payload: ComplianceEventCreate, db: AsyncSession = Depends(get_db)) -> ComplianceEventResponse:
    """Create a new compliance deadline event in SQLite."""
    evt_id = str(uuid.uuid4())

    evt = ComplianceEvent(
        id=evt_id,
        profile_id=payload.profile_id,
        title=payload.title,
        category=payload.category,
        due_date=payload.due_date,
        status=payload.status,
        description=payload.description,
        authority=payload.authority,
    )
    db.add(evt)
    await db.commit()
    await db.refresh(evt)

    return _to_response(evt)


@router.get("/calendar/event", response_model=CalendarEventsResponse, summary="List Compliance Deadline Events")
async def list_events(
    profile_id: Optional[str] = Query(None, description="Filter events by BusinessProfile ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (UPCOMING, OVERDUE, DONE)"),
    db: AsyncSession = Depends(get_db),
) -> CalendarEventsResponse:
    """List compliance deadline events sorted chronologically by due date."""
    query = select(ComplianceEvent).order_by(ComplianceEvent.due_date.asc())
    if profile_id:
        query = query.where(ComplianceEvent.profile_id == profile_id)

    result = await db.execute(query)
    events = result.scalars().all()

    # Evaluate and persist status changes (e.g. UPCOMING -> OVERDUE)
    has_changes = False
    for evt in events:
        new_status = _evaluate_event_status(evt)
        if new_status != evt.status:
            evt.status = new_status
            has_changes = True

    if has_changes:
        await db.commit()

    # Filter by status if specified
    responses = [_to_response(e) for e in events]
    if status_filter:
        sf = status_filter.upper()
        responses = [r for r in responses if r.status.upper() == sf]

    upcoming_cnt = sum(1 for e in events if _evaluate_event_status(e) == "UPCOMING")
    overdue_cnt = sum(1 for e in events if _evaluate_event_status(e) == "OVERDUE")
    done_cnt = sum(1 for e in events if _evaluate_event_status(e) == "DONE")

    return CalendarEventsResponse(
        total=len(responses),
        upcoming_count=upcoming_cnt,
        overdue_count=overdue_cnt,
        done_count=done_cnt,
        events=responses,
    )


@router.get("/calendar/event/{event_id}", response_model=ComplianceEventResponse, summary="Get Compliance Event by ID")
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)) -> ComplianceEventResponse:
    """Retrieve a specific compliance deadline event by ID."""
    evt = await db.get(ComplianceEvent, event_id)
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance Event with ID '{event_id}' not found.",
        )

    new_status = _evaluate_event_status(evt)
    if new_status != evt.status:
        evt.status = new_status
        await db.commit()
        await db.refresh(evt)

    return _to_response(evt)


@router.patch("/calendar/event/{event_id}", response_model=ComplianceEventResponse, summary="Update Compliance Event")
async def update_event(event_id: str, payload: ComplianceEventUpdate, db: AsyncSession = Depends(get_db)) -> ComplianceEventResponse:
    """Update details or status of a compliance deadline event."""
    evt = await db.get(ComplianceEvent, event_id)
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance Event with ID '{event_id}' not found.",
        )

    if payload.profile_id is not None:
        evt.profile_id = payload.profile_id
    if payload.title is not None:
        evt.title = payload.title
    if payload.category is not None:
        evt.category = payload.category
    if payload.due_date is not None:
        evt.due_date = payload.due_date
    if payload.status is not None:
        evt.status = payload.status
    if payload.description is not None:
        evt.description = payload.description
    if payload.authority is not None:
        evt.authority = payload.authority

    evt.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(evt)

    return _to_response(evt)


@router.delete("/calendar/event/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Compliance Event")
async def delete_event(event_id: str, db: AsyncSession = Depends(get_db)) -> None:
    """Delete a compliance deadline event by ID."""
    evt = await db.get(ComplianceEvent, event_id)
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Compliance Event with ID '{event_id}' not found.",
        )

    await db.delete(evt)
    await db.commit()
