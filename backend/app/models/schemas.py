"""
models/schemas.py — Pydantic request/response models for all API endpoints.
"""
from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ============================================================
# Shared sub-models
# ============================================================


class SourceRef(BaseModel):
    """A single retrieved knowledge-base source cited in an answer."""

    id: str
    title: str
    authority: Optional[str] = None
    url: Optional[str] = None
    document_type: Optional[str] = None
    relevance_score: Optional[float] = None


class Action(BaseModel):
    """A next-step action generated from the answer."""

    step: int
    description: str
    required_documents: List[str] = Field(default_factory=list)


class DeadlineInfo(BaseModel):
    deadline_date: Optional[str] = None
    description: Optional[str] = None


class DocumentSummary(BaseModel):
    doc_type: str = ""
    summary: str = ""
    deadline_date: Optional[str] = None
    key_requirements: List[str] = Field(default_factory=list)


# ============================================================
# POST /api/chat
# ============================================================


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4096, description="User's question")
    language: Optional[str] = Field(None, description="BCP-47 language tag, e.g. 'hi', 'ta'")
    conversation_id: Optional[str] = Field(None, description="Resume an existing conversation")


class ChatResponse(BaseModel):
    message_id: str
    conversation_id: str
    answer: str
    sources: List[SourceRef] = Field(default_factory=list)
    confidence: str = Field(description="HIGH | MEDIUM | LOW")
    confidence_score: float
    actions: List[Action] = Field(default_factory=list)
    detected_language: Optional[str] = None


# ============================================================
# POST /api/upload
# ============================================================


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    extracted_text_preview: str = Field(description="First ~500 chars of extracted text")
    page_count: int = 0


# ============================================================
# POST /api/document/analyze
# ============================================================


class DocumentAnalyzeRequest(BaseModel):
    document_id: str
    question: Optional[str] = None
    language: Optional[str] = None


class DocumentAnalyzeResponse(BaseModel):
    document_id: str
    summary: DocumentSummary
    deadline: Optional[DeadlineInfo] = None
    requirements: List[str] = Field(default_factory=list)
    sources: List[SourceRef] = Field(default_factory=list)
    confidence: str = "MEDIUM"
    confidence_score: float = 0.0
    answer: Optional[str] = None


# ============================================================
# GET /api/sources
# ============================================================


class SourceListItem(BaseModel):
    id: str
    title: str
    authority: Optional[str] = None
    url: Optional[str] = None
    document_type: Optional[str] = None
    topic: Optional[str] = None
    publication_date: Optional[str] = None


class SourcesResponse(BaseModel):
    sources: List[SourceListItem]
    total: int


# ============================================================
# POST /api/feedback
# ============================================================


class FeedbackRequest(BaseModel):
    message_id: str
    rating: int = Field(..., description="1 for thumbs-up, -1 for thumbs-down")
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    ok: bool
    message_id: str


# ============================================================
# Generic error
# ============================================================


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
    extra: Optional[Any] = None


# ============================================================
# Business Profile & Compliance Passport Schemas
# ============================================================


class IPAssetSchema(BaseModel):
    asset_type: str = Field(description="Patent | Trademark | GI | Copyright")
    title: str = Field(..., min_length=1)
    status: str = Field(default="Granted", description="Granted | Pending | Draft | Expired")
    registration_no: Optional[str] = None


class BusinessProfileCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=256)
    sector: str = Field(default="AYUSH", description="AYUSH | Pharma | Biotech | Software | MSME | Other")
    company_type: str = Field(default="Startup", description="Startup | MSME | Enterprise | Researcher")
    registration_number: Optional[str] = None
    state: Optional[str] = None
    ip_assets: List[IPAssetSchema] = Field(default_factory=list)


class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    sector: Optional[str] = None
    company_type: Optional[str] = None
    registration_number: Optional[str] = None
    state: Optional[str] = None
    ip_assets: Optional[List[IPAssetSchema]] = None


class BusinessProfileResponse(BaseModel):
    id: str
    company_name: str
    sector: str
    company_type: str
    registration_number: Optional[str] = None
    state: Optional[str] = None
    ip_assets: List[IPAssetSchema] = Field(default_factory=list)
    created_at: str
    updated_at: str


class ChecklistItem(BaseModel):
    item: str
    status: str = Field(description="PASSED | WARNING | CRITICAL")
    guidance: str


class AssetBreakdown(BaseModel):
    patents_count: int = 0
    trademarks_count: int = 0
    copyrights_count: int = 0
    gis_count: int = 0
    total_assets: int = 0


class CompliancePassportResponse(BaseModel):
    profile_id: str
    company_name: str
    sector: str
    company_type: str
    overall_score: int = Field(description="Compliance Score between 0 and 100")
    status_level: str = Field(description="EXCELLENT | GOOD | NEEDS_ATTENTION | HIGH_RISK")
    asset_breakdown: AssetBreakdown
    compliance_checklist: List[ChecklistItem] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    next_filing_deadline: Optional[str] = None


# ============================================================
# TKDL Risk Assessment Schemas (POST /api/tk-risk/assess)
# ============================================================


class IngredientInput(BaseModel):
    name: str = Field(..., min_length=1, description="Common or traditional herb name e.g. Ashwagandha")
    latin_name: Optional[str] = Field(None, description="Botanical name e.g. Withania somnifera")
    percentage: Optional[float] = Field(None, description="Composition percentage")


class TKRiskRequest(BaseModel):
    formulation_name: str = Field(..., min_length=1, max_length=256)
    system: str = Field(default="Ayurveda", description="Ayurveda | Siddha | Unani | Polyherbal")
    ingredients: List[IngredientInput] = Field(..., min_items=1)
    proposed_claims: Optional[str] = Field(None, description="Intended therapeutic benefit or product claim")


class TKMatchResult(BaseModel):
    ingredient_name: str
    traditional_name: str
    latin_name: str
    system: str
    tkdl_reference: str
    classical_text_source: str
    risk_factor: str = Field(description="HIGH_PRIOR_ART | MODERATE | LOW")
    known_therapeutic_use: str


class TKRiskResponse(BaseModel):
    formulation_name: str
    system: str
    overall_risk_score: int = Field(description="Section 3(p) Patent Rejection Risk (0-100)")
    risk_level: str = Field(description="HIGH_RISK | MODERATE_RISK | LOW_RISK")
    matched_entries: List[TKMatchResult] = Field(default_factory=list)
    patentability_assessment: str
    key_recommendations: List[str] = Field(default_factory=list)
    section_3p_compliance_status: str


