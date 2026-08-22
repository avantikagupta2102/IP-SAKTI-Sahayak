"""
routers/chat.py — POST /api/chat
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db import Conversation, Message
from app.models.schemas import ChatRequest, ChatResponse
from app.services import rag

import json

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse, summary="Ask a grounded question")
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)) -> ChatResponse:
    """
    Ask a question about Indian IP law or AYUSH regulations.

    The response is grounded in retrieved knowledge-base chunks.
    Every answer includes source citations, a confidence indicator, and next steps.
    """
    # Ensure a conversation record exists
    if request.conversation_id:
        conversation = await db.get(Conversation, request.conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation '{request.conversation_id}' not found.",
            )
    else:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            language=request.language or "en",
        )
        db.add(conversation)
        await db.flush()

    # Store user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        text=request.query,
    )
    db.add(user_msg)

    # Run RAG pipeline
    try:
        response: ChatResponse = await rag.answer_query(
            query=request.query,
            language=request.language,
            conversation_id=conversation.id,
        )
    except Exception as e:
        logger.exception(f"RAG pipeline error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your question. Please try again.",
        )

    # Store assistant message
    assistant_msg = Message(
        id=response.message_id,
        conversation_id=conversation.id,
        role="assistant",
        text=response.answer,
        sources_json=json.dumps([s.model_dump() for s in response.sources]),
        actions_json=json.dumps([a.model_dump() for a in response.actions]),
        confidence=response.confidence,
        confidence_score=response.confidence_score,
    )
    db.add(assistant_msg)

    return response
