"""Guided invention profiling and preliminary draft generation."""
from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Dict, List, Tuple

from app.models.schemas import FilingDraftResponse, InventionProfile
from app.services.llm import complete_json

logger = logging.getLogger(__name__)
_SESSIONS: Dict[str, InventionProfile] = {}

_FIELDS = [
    ("title", "What is a concise working title for the invention?"),
    ("technical_field", "What technical field or industry does it belong to?"),
    ("problem_statement", "What specific problem does it solve?"),
    ("proposed_solution", "How does the proposed solution work at a high level?"),
    ("novel_features", "Which technical features do you believe are new?"),
    ("components", "What are the main components, materials, or modules?"),
    ("working_principle", "Please explain the working principle or key process steps."),
    ("differentiators", "How does it differ from the current or known approach?"),
]

_PROFILE_PROMPT = """Extract an invention profile from the user's description and any existing profile.
Return valid JSON only. Do not infer specific facts that are not stated; leave unknown values empty.
Schema keys: title, technical_field, problem_statement, existing_approach, proposed_solution,
novel_features (array), components (array), working_principle, process_steps (array),
advantages (array), applications (array), differentiators (array).
Existing profile:
{profile}
User message:
{message}
"""
_FILING_JSON_SYSTEM = "You extract only facts stated by the user into the requested JSON schema. Return valid JSON only. Keep arrays short. Never invent facts."


def _parse_profile(raw: str) -> InventionProfile | None:
    try:
        cleaned = raw.strip()
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            cleaned = match.group(0)
        return InventionProfile.model_validate(json.loads(cleaned))
    except (json.JSONDecodeError, ValueError, TypeError):
        return None


def _missing(profile: InventionProfile) -> List[Tuple[str, str]]:
    return [(field, question) for field, question in _FIELDS if not getattr(profile, field)]


def _fallback_profile(message: str) -> InventionProfile:
    """Extract only directly stated phrases when the local model is unavailable."""
    text = message.strip()
    lower = text.lower()
    profile = InventionProfile(proposed_solution=text)
    if "controller" in lower:
        profile.title = re.sub(r"^(i developed|i have developed|we developed)\s+", "", text, flags=re.I).split(" that ")[0].strip().capitalize()
    if any(term in lower for term in ("irrigation", "farm", "agriculture", "crop", "soil")):
        profile.technical_field = "Agricultural technology"
        profile.applications = ["Agricultural irrigation"] if "irrigation" in lower else ["Agriculture"]
    if "soil moisture" in lower:
        profile.components.append("soil moisture sensor")
        profile.novel_features.append("soil-moisture-based control")
        profile.working_principle = "Uses soil moisture readings to control irrigation."
    if "pump" in lower:
        profile.components.append("water pump")
    if "solar" in lower:
        profile.components.append("solar power source")
        profile.novel_features.append("solar-powered operation")
    if "automatically" in lower or "automatic" in lower:
        profile.novel_features.append("automatic control")
    if "low-cost" in lower or "low cost" in lower:
        profile.advantages.append("Low cost")
    return profile


def _merge_profiles(current: InventionProfile, extracted: InventionProfile) -> InventionProfile:
    """Preserve earlier verified context while filling only with new values."""
    values = current.model_dump()
    for field, value in extracted.model_dump().items():
        if isinstance(value, list):
            values[field] = list(dict.fromkeys([*values[field], *value]))
        elif value and (not values[field] or field == "proposed_solution"):
            values[field] = value
    return InventionProfile.model_validate(values)


def _set_missing_answer(profile: InventionProfile, field: str | None, message: str) -> InventionProfile:
    if not field:
        return profile
    values = profile.model_dump()
    values[field] = [message.strip()] if isinstance(values[field], list) else message.strip()
    return InventionProfile.model_validate(values)


def update_profile(session_id: str | None, message: str) -> Tuple[str, InventionProfile, bool]:
    current_id = session_id or str(uuid.uuid4())
    current = _SESSIONS.get(current_id, InventionProfile())
    first_missing = _missing(current)[0][0] if _missing(current) else None
    try:
        raw = complete_json(_PROFILE_PROMPT.format(profile=current.model_dump_json(), message=message), system_prompt=_FILING_JSON_SYSTEM, max_tokens=700)
        extracted = _parse_profile(raw)
    except Exception as exc:
        logger.warning("Invention profile extraction failed: %s", exc)
        extracted = None
    if extracted is None:
        extracted = _fallback_profile(message) if not any(current.model_dump().values()) else _set_missing_answer(current, first_missing, message)
        from app.services.ollama import check_ollama
        available = check_ollama()["status"] == "ready"
    else:
        extracted = _merge_profiles(current, extracted)
        if first_missing and not getattr(extracted, first_missing):
            extracted = _set_missing_answer(extracted, first_missing, message)
        available = True
    _SESSIONS[current_id] = extracted
    return current_id, extracted, available


def get_profile(session_id: str) -> InventionProfile | None:
    return _SESSIONS.get(session_id)


def next_question(profile: InventionProfile) -> Tuple[str | None, List[str], int]:
    missing = _missing(profile)
    known = len(_FIELDS) - len(missing)
    return (missing[0][1] if missing else None, [field for field, _ in missing], round(known / len(_FIELDS) * 100))


def generate_draft(session_id: str, profile: InventionProfile) -> FilingDraftResponse:
    prompt = f"""Create a concise preliminary IP filing draft from this verified profile.
Return valid JSON only with keys: title, abstract, technical_field, background, summary,
detailed_description, key_features (array), advantages (array), claim_concepts (array).
Do not add facts absent from the profile and describe claim concepts as non-legal concepts.
Profile: {profile.model_dump_json()}"""
    data = None
    try:
        raw = complete_json(prompt, system_prompt=_FILING_JSON_SYSTEM, max_tokens=1200)
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            data = parsed
    except Exception as exc:
        logger.warning("Draft generation failed: %s", exc)
    if not data:
        data = {
            "title": profile.title or "Untitled invention",
            "abstract": profile.proposed_solution,
            "technical_field": profile.technical_field,
            "background": profile.problem_statement,
            "summary": profile.proposed_solution,
            "detailed_description": profile.working_principle or "; ".join(profile.process_steps),
            "key_features": profile.novel_features,
            "advantages": profile.advantages,
            "claim_concepts": [f"A system or method including {feature}" for feature in profile.novel_features],
        }
    return FilingDraftResponse(session_id=session_id, profile=profile, **{key: data.get(key, "" if key not in {"key_features", "advantages", "claim_concepts"} else []) for key in ["title", "abstract", "technical_field", "background", "summary", "detailed_description", "key_features", "advantages", "claim_concepts"]})
