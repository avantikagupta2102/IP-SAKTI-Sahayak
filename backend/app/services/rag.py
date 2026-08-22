"""
services/rag.py — Core RAG pipeline: retrieval → grounded answer → confidence → actions.

Pipeline (per query):
  1. Detect language → translate query to English
  2. Embed query → similarity search in Chroma
  3. Build grounded prompt with retrieved chunks
  4. Call LLM → answer
  5. Score confidence
  6. Translate answer back to user's language
  7. Return structured response
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import List, Optional

from app.core.config import get_settings
from app.models.schemas import Action, ChatResponse, SourceRef
from app.services.confidence import score_confidence
from app.services.language import detect_language, normalize_language_code, translate_from_english, translate_to_english
from app.services.llm import GROUNDING_SYSTEM_PROMPT, complete, complete_json
from app.services.vector_store import RetrievedChunk, similarity_search

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================
# Prompt building
# ============================================================

def _build_grounded_prompt(query_en: str, chunks: List[RetrievedChunk]) -> str:
    """
    Build the user-facing prompt that injects retrieved evidence chunks.
    The LLM is instructed to answer ONLY from this evidence.
    """
    if not chunks:
        evidence_block = (
            "No relevant evidence was found in the knowledge base for this query."
        )
    else:
        evidence_parts = []
        for i, chunk in enumerate(chunks, start=1):
            source_label = chunk.source_title or "Unknown Source"
            authority = chunk.authority or ""
            url = chunk.source_url or ""
            meta_line = f"Source: {source_label}"
            if authority:
                meta_line += f" | Authority: {authority}"
            if url:
                meta_line += f" | URL: {url}"
            evidence_parts.append(
                f"[Evidence {i}]\n{meta_line}\n\n{chunk.text}"
            )
        evidence_block = "\n\n---\n\n".join(evidence_parts)

    return (
        f"EVIDENCE (use ONLY the following to answer the question):\n\n"
        f"{evidence_block}\n\n"
        f"---\n\n"
        f"QUESTION: {query_en}\n\n"
        f"Remember: cite source titles for every claim. If the evidence does not fully answer "
        f"the question, say so explicitly. End with numbered Next Steps if supported by evidence."
    )


# ============================================================
# Action extraction
# ============================================================

_ACTION_EXTRACTION_PROMPT = """Based on the following answer about Indian IP or AYUSH regulations, \
extract a structured list of next steps the user should take.

Respond with valid JSON only:
{{
  "actions": [
    {{
      "step": 1,
      "description": "<concrete action>",
      "required_documents": ["<doc1>", "<doc2>"]
    }}
  ]
}}

If no clear next steps can be extracted, return {{"actions": []}}.

Answer text:
{answer}
"""


def _extract_actions(answer: str) -> List[Action]:
    """Parse next steps from the LLM answer into structured Action objects."""
    try:
        raw = complete_json(
            _ACTION_EXTRACTION_PROMPT.format(answer=answer[:2000]),
            max_tokens=512,
        )
        data = json.loads(raw)
        actions = []
        for item in data.get("actions", []):
            actions.append(
                Action(
                    step=item.get("step", len(actions) + 1),
                    description=item.get("description", ""),
                    required_documents=item.get("required_documents", []),
                )
            )
        return actions
    except Exception as e:
        logger.warning(f"Action extraction failed: {e}")
        return []


# ============================================================
# Main RAG function
# ============================================================

async def answer_query(
    query: str,
    language: Optional[str] = None,
    conversation_id: Optional[str] = None,
    extra_context: Optional[str] = None,
) -> ChatResponse:
    """
    Full RAG pipeline: takes a user query and returns a grounded ChatResponse.

    Args:
        query:           Raw user query (any language).
        language:        Optional BCP-47 language code hint (e.g. 'hi', 'ta').
        conversation_id: Optional conversation ID to associate the message with.
        extra_context:   Optional additional text to prepend to the evidence
                         (e.g. uploaded document content).

    Returns:
        ChatResponse with answer, sources, confidence, and actions.
    """
    # 1. Language detection & normalisation
    detected_lang = normalize_language_code(language or detect_language(query))
    logger.info(f"Query language detected: {detected_lang}")

    # 2. Translate query to English for retrieval
    query_en = translate_to_english(query, detected_lang)
    logger.info(f"English query: {query_en[:120]}")

    # 3. Retrieve relevant chunks
    chunks = similarity_search(query_en, top_k=settings.retrieval_top_k)
    top_score = f"{chunks[0].score:.3f}" if chunks else "N/A"
    logger.info(f"Retrieved {len(chunks)} chunks (top score: {top_score})")

    # 4. Build grounded prompt (inject extra context first if provided)
    full_query = query_en
    if extra_context:
        full_query = f"Document context:\n{extra_context[:2000]}\n\nUser question: {query_en}"

    grounded_prompt = _build_grounded_prompt(full_query, chunks)

    # 5. LLM call
    answer_en = complete(grounded_prompt, system_prompt=GROUNDING_SYSTEM_PROMPT)

    # 6. Confidence scoring
    confidence_result = score_confidence(chunks, answer_en)
    logger.info(
        f"Confidence: {confidence_result.label} (score={confidence_result.score})"
    )

    # 7. Translate answer back to user's language
    answer_final = translate_from_english(answer_en, detected_lang)

    # 8. Extract actions (always in English then translate if needed)
    actions = _extract_actions(answer_en)

    # 9. Build source references
    sources: List[SourceRef] = []
    seen_ids: set[str] = set()
    for chunk in chunks:
        sid = chunk.source_id or chunk.chunk_id
        if sid in seen_ids:
            continue
        seen_ids.add(sid)
        sources.append(
            SourceRef(
                id=sid,
                title=chunk.source_title or "Unknown Source",
                authority=chunk.authority,
                url=chunk.source_url,
                document_type=chunk.metadata.get("document_type"),
                relevance_score=round(chunk.score, 4),
            )
        )

    # 10. Assemble response
    conv_id = conversation_id or str(uuid.uuid4())
    message_id = str(uuid.uuid4())

    return ChatResponse(
        message_id=message_id,
        conversation_id=conv_id,
        answer=answer_final,
        sources=sources,
        confidence=confidence_result.label,
        confidence_score=confidence_result.score,
        actions=actions,
        detected_language=detected_lang,
    )
