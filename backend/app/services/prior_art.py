"""Prior-art-style similarity analysis over the indexed local document corpus."""
from __future__ import annotations

import re
from typing import List

from app.models.schemas import InventionProfile, PriorArtResult, PriorArtSearchResponse
from app.services.vector_store import RetrievedChunk, collection_count, similarity_search

_STOPWORDS = {"the", "and", "for", "with", "from", "that", "this", "into", "using", "are", "how"}


def _terms(text: str) -> set[str]:
    return {word for word in re.findall(r"[a-z0-9]{4,}", text.lower()) if word not in _STOPWORDS}


def profile_query(profile: InventionProfile) -> str:
    parts = [profile.title, profile.technical_field, profile.problem_statement, profile.proposed_solution,
             profile.working_principle, " ".join(profile.novel_features), " ".join(profile.components)]
    return " ".join(part for part in parts if part.strip())


def _result(chunk: RetrievedChunk, profile: InventionProfile, query_terms: set[str]) -> PriorArtResult:
    document_terms = _terms(chunk.text)
    concepts = sorted(query_terms & document_terms)[:8]
    overlapping = [feature for feature in profile.novel_features if _terms(feature) & document_terms]
    distinguishing = [feature for feature in profile.differentiators if not (_terms(feature) & document_terms)]
    title = chunk.source_title or "Untitled indexed document"
    source = chunk.authority or chunk.source_url or "Local indexed corpus"
    explanation = "Matching indexed language includes " + (", ".join(concepts) if concepts else "related semantic content") + "."
    return PriorArtResult(title=title, source=source, document_id=chunk.source_id or chunk.chunk_id,
                          similarity_score=round(chunk.score * 100, 1), matching_concepts=concepts,
                          overlapping_features=overlapping, distinguishing_features=distinguishing,
                          explanation=explanation)


def search_prior_art(profile: InventionProfile, top_k: int = 6) -> PriorArtSearchResponse:
    query = profile_query(profile)
    if not query.strip():
        return PriorArtSearchResponse(query_representation="", corpus_count=collection_count(), results=[])
    chunks = similarity_search(query, top_k=top_k)
    terms = _terms(query)
    return PriorArtSearchResponse(query_representation=query, corpus_count=collection_count(),
                                  results=[_result(chunk, profile, terms) for chunk in chunks])
