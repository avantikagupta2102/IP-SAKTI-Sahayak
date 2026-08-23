from fastapi.testclient import TestClient

from app.models.schemas import InventionProfile
from app.services import filing_assistant, prior_art
from app.services.readiness import score_profile


def profile(**overrides):
    values = {"title": "Solar controller", "technical_field": "Agriculture", "problem_statement": "Wastes water", "proposed_solution": "Controls a pump", "novel_features": ["solar sensor"], "components": ["sensor", "pump"], "working_principle": "Reads soil moisture", "process_steps": ["measure", "switch"], "advantages": ["low cost"], "applications": ["farms"], "differentiators": ["offline operation"], "existing_approach": "Manual watering"}
    values.update(overrides)
    return InventionProfile(**values)


def test_readiness_is_reproducible_and_bounded():
    result = score_profile(profile(), draft_present=True)
    assert result.score == 100
    assert len(result.dimensions) == 7
    assert all(0 <= item.score <= 100 for item in result.dimensions)


def test_empty_profile_has_actionable_missing_information():
    result = score_profile(InventionProfile())
    assert result.score == 0
    assert result.missing_information
    assert result.recommended_next_steps


def test_malformed_llm_profile_is_controlled(monkeypatch):
    monkeypatch.setattr(filing_assistant, "complete_json", lambda prompt, **kwargs: "not json")
    session_id, extracted, available = filing_assistant.update_profile(None, "A solar irrigation controller")
    assert session_id
    assert available
    assert extracted.proposed_solution == "A solar irrigation controller"


def test_invention_extraction_validates_structured_output(monkeypatch):
    monkeypatch.setattr(filing_assistant, "complete_json", lambda prompt, **kwargs: '{"title":"Irrigation controller","technical_field":"Agriculture","novel_features":["solar control"]}')
    _, extracted, available = filing_assistant.update_profile(None, "A controller")
    assert available
    assert extracted.title == "Irrigation controller"
    assert extracted.novel_features == ["solar control"]


def test_empty_prior_art_query_returns_no_results(monkeypatch):
    monkeypatch.setattr(prior_art, "collection_count", lambda: 0)
    response = prior_art.search_prior_art(InventionProfile())
    assert response.results == []
    assert response.corpus_count == 0


def test_prior_art_maps_indexed_metadata(monkeypatch):
    from app.services.vector_store import RetrievedChunk
    monkeypatch.setattr(prior_art, "collection_count", lambda: 1)
    monkeypatch.setattr(prior_art, "similarity_search", lambda query, top_k: [RetrievedChunk("chunk-1", "solar sensor pump", 0.84, {"source_id": "doc-1", "document_title": "Indexed irrigation document", "authority": "Local corpus"})])
    response = prior_art.search_prior_art(profile())
    assert response.results[0].title == "Indexed irrigation document"
    assert response.results[0].similarity_score == 84.0
    assert response.results[0].document_id == "doc-1"


def test_readiness_api_endpoint():
    from app.main import app
    response = TestClient(app).post("/api/readiness/score", json={"profile": InventionProfile().model_dump()})
    assert response.status_code == 200
    assert response.json()["score"] == 0
