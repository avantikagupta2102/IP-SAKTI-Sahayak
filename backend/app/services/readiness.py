"""Deterministic IP readiness scoring for an invention profile."""
from __future__ import annotations

from typing import List

from app.models.schemas import (
    InventionProfile,
    PriorArtResult,
    ReadinessDimension,
    ReadinessResponse,
)


def _text_score(values: List[str], minimum: int = 1) -> int:
    present = sum(bool(value.strip()) for value in values)
    return min(100, round(present / minimum * 100))


def score_profile(
    profile: InventionProfile,
    draft_present: bool = False,
    prior_art_results: List[PriorArtResult] | None = None,
) -> ReadinessResponse:
    """Score completeness, not patentability, using fixed weighted dimensions.

    Weights: clarity 15%, technical detail 20%, novelty 15%, problem/solution
    15%, differentiation 15%, documentation 10%, draft 10%.
    """
    prior_art_results = prior_art_results or []
    clarity = _text_score([profile.title, profile.technical_field], 2)
    technical = round(sum([
        bool(profile.proposed_solution.strip()),
        bool(profile.working_principle.strip()),
        bool(profile.components),
        bool(profile.process_steps),
    ]) / 4 * 100)
    novelty = _text_score(["x" if profile.novel_features else "", "x" if profile.differentiators else ""], 2)
    problem_solution = _text_score([profile.problem_statement, profile.proposed_solution], 2)
    differentiation = 100 if profile.differentiators else (50 if profile.novel_features else 0)
    documentation = round(sum([
        bool(profile.advantages),
        bool(profile.applications),
        bool(profile.existing_approach),
    ]) / 3 * 100)
    draft = 100 if draft_present else 0

    dimensions = [
        ReadinessDimension(name="Invention clarity", score=clarity, rationale="Title and technical field are identified." if clarity == 100 else "Add a specific title and technical field."),
        ReadinessDimension(name="Technical detail completeness", score=technical, rationale="Working principle, components, solution, and steps are covered." if technical == 100 else "Describe components, operation, and process steps in more detail."),
        ReadinessDimension(name="Novelty articulation", score=novelty, rationale="Novel features and differentiators are recorded." if novelty == 100 else "State the concrete technical features believed to be new."),
        ReadinessDimension(name="Problem/solution clarity", score=problem_solution, rationale="Both the problem and proposed solution are present." if problem_solution == 100 else "Clarify the problem being solved and how the solution addresses it."),
        ReadinessDimension(name="Differentiation from prior art", score=differentiation, rationale="Differentiating characteristics are explicit." if differentiation == 100 else "Explain how the invention differs from existing approaches and retrieved documents."),
        ReadinessDimension(name="Documentation completeness", score=documentation, rationale="Advantages, applications, and existing approach are captured." if documentation == 100 else "Add intended applications, advantages, and the current approach."),
        ReadinessDimension(name="Filing draft completeness", score=draft, rationale="A preliminary draft has been generated." if draft else "Generate the preliminary filing draft after completing the profile."),
    ]
    weights = [15, 20, 15, 15, 15, 10, 10]
    score = round(sum(d.score * weight for d, weight in zip(dimensions, weights)) / 100)
    missing = [d.rationale for d in dimensions if d.score < 100]
    strengths = [d.name for d in dimensions if d.score >= 75]
    steps = list(missing[:3])
    if prior_art_results:
        steps.append("Review potential overlap in the indexed similarity results with a qualified IP professional.")
    return ReadinessResponse(
        score=score,
        dimensions=dimensions,
        strengths=strengths,
        missing_information=missing,
        recommended_next_steps=steps,
    )
