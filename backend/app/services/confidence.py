"""
services/confidence.py — Rule-based confidence scoring.

Implements the scoring rubric from the architecture plan (§3):

  score = 0
  +2 if top retrieval similarity > THRESHOLD_HIGH
  +1 if ≥2 chunks support the same claim (proxy: ≥2 chunks retrieved)
  +1 if source authority is a primary source (gov site)
  -2 if LLM self-reports "not fully covered" or answer contains hedging language
  -2 if fewer than 2 relevant chunks retrieved

  score ≥ 4  → HIGH
  score 2–3  → MEDIUM
  score < 2  → LOW
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

from app.core.config import get_settings
from app.services.vector_store import RetrievedChunk

settings = get_settings()

# Patterns that indicate the LLM is hedging or self-reporting gaps
_HEDGE_PATTERNS = re.compile(
    r"(not (?:fully )?covered|cannot (?:fully )?answer|insufficient evidence|"
    r"please consult|not enough information|may not be accurate|"
    r"outside (?:the )?scope|i don'?t have|no information|unclear from)",
    re.IGNORECASE,
)


@dataclass
class ConfidenceResult:
    label: str          # HIGH | MEDIUM | LOW
    score: float        # raw integer score (for storage / debugging)
    reasons: List[str]  # human-readable explanations for each +/- point


def score_confidence(
    chunks: List[RetrievedChunk],
    answer: str,
) -> ConfidenceResult:
    """
    Compute a rule-based confidence score given the retrieved chunks and the
    LLM's answer text.

    Args:
        chunks:  Chunks returned from similarity_search(), sorted by score desc.
        answer:  The LLM's text answer.

    Returns:
        A ConfidenceResult with label, numeric score, and reasons.
    """
    score = 0
    reasons: List[str] = []

    # --- Positive signals ---

    if chunks and chunks[0].score >= settings.similarity_threshold_high:
        score += 2
        reasons.append(
            f"+2: Top chunk similarity {chunks[0].score:.2f} ≥ threshold "
            f"({settings.similarity_threshold_high})"
        )
    elif chunks:
        reasons.append(
            f"  0: Top chunk similarity {chunks[0].score:.2f} < threshold "
            f"({settings.similarity_threshold_high})"
        )

    if len(chunks) >= 2:
        score += 1
        reasons.append(f"+1: {len(chunks)} chunks retrieved (≥2 corroborating sources)")
    else:
        reasons.append(f"  0: Only {len(chunks)} chunk(s) retrieved")

    has_primary = any(c.is_primary_source for c in chunks)
    if has_primary:
        score += 1
        reasons.append("+1: At least one primary government source cited")
    else:
        reasons.append("  0: No primary government source in results")

    # --- Negative signals ---

    if _HEDGE_PATTERNS.search(answer):
        score -= 2
        reasons.append("-2: Answer contains hedging/insufficient-evidence language")

    if len(chunks) < 2:
        score -= 2
        reasons.append("-2: Fewer than 2 relevant chunks retrieved")

    # --- Map score to label ---
    if score >= 4:
        label = "HIGH"
    elif score >= 2:
        label = "MEDIUM"
    else:
        label = "LOW"

    return ConfidenceResult(label=label, score=float(score), reasons=reasons)
