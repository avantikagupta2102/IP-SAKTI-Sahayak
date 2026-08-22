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


# ============================================================
# IP Regulations & Impact Ranking Schemas (GET /api/regulations)
# ============================================================


class RegulationItem(BaseModel):
    id: str
    title: str
    authority: str
    sectors: List[str] = Field(default_factory=list)
    asset_types: List[str] = Field(default_factory=list)
    summary: str
    impact_level: str = Field(description="CRITICAL | HIGH | MODERATE")
    key_provisions: List[str] = Field(default_factory=list)
    official_reference: str
    relevance_score: Optional[int] = Field(None, description="Computed relevance score 0-100 for a given profile")
    relevance_reason: Optional[str] = Field(None, description="Reason why this regulation is relevant to the profile")


class RegulationsResponse(BaseModel):
    total: int
    regulations: List[RegulationItem]


class RegulationImpactResponse(BaseModel):
    profile_id: str
    company_name: str
    sector: str
    company_type: str
    total_matched: int
    regulations: List[RegulationItem]


# ============================================================
# Compliance Deadline Calendar Schemas (/api/calendar/event)
# ============================================================


class ComplianceEventCreate(BaseModel):
    profile_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=256)
    category: str = Field(default="PATENT", description="PATENT | TRADEMARK | AYUSH_LICENSE | BIODIVERSITY | GENERAL")
    due_date: str = Field(..., description="ISO Date string YYYY-MM-DD")
    status: str = Field(default="UPCOMING", description="UPCOMING | OVERDUE | DONE")
    description: Optional[str] = None
    authority: Optional[str] = Field(None, description="e.g. CGPDTM, State AYUSH Authority, NBA")


class ComplianceEventUpdate(BaseModel):
    profile_id: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    authority: Optional[str] = None


class ComplianceEventResponse(BaseModel):
    id: str
    profile_id: Optional[str] = None
    title: str
    category: str
    due_date: str
    status: str
    description: Optional[str] = None
    authority: Optional[str] = None
    created_at: str
    updated_at: str


class CalendarEventsResponse(BaseModel):
    total: int
    upcoming_count: int
    overdue_count: int
    done_count: int
    events: List[ComplianceEventResponse]


# ============================================================
# AI Expert Brief Schemas (POST /api/expert-brief)
# ============================================================


class ExpertBriefRequest(BaseModel):
    profile_id: str = Field(..., description="ID of BusinessProfile to evaluate")


class ExpertBriefResponse(BaseModel):
    profile_id: str
    company_name: str
    sector: str
    company_type: str
    generated_at: str
    compliance_score: int
    status_level: str
    brief_markdown: str
    key_takeaways: List[str] = Field(default_factory=list)
    next_milestones: List[str] = Field(default_factory=list)


# ============================================================
# Investor & Incubator Matchmaker Schemas (POST /api/investor-match/*)
# ============================================================


class InvestorProfileItem(BaseModel):
    id: str
    name: str
    type: str  # VC | Angel | TTO | Scheme
    entity_name: str
    preferred_sectors: List[str]
    ticket_size_min_lakhs: float
    ticket_size_max_lakhs: float
    match_score: float = Field(..., description="Cosine similarity score (0 - 100)")
    thesis_summary: str
    verified_status: bool = True
    active_dealroom_id: Optional[str] = None


class GovtSchemeMatchItem(BaseModel):
    id: str
    scheme_name: str
    ministry: str
    max_funding_lakhs: float
    funding_type: str  # Grant | Equity-free Seed | Subsidy | Loan Guarantee
    eligibility_match: bool
    matching_criteria: List[str]


class InvestorMatchRequest(BaseModel):
    profile_id: Optional[str] = None
    ip_abstract: Optional[str] = None
    sector: str = "AYUSH"
    stage: str = "Seed"  # Idea | Provisional | TRL-4 | Granted
    funding_required_lakhs: float = 25.0


class InvestorMatchResponse(BaseModel):
    ip_verification_status: str  # VERIFIED | PENDING | PROVISIONAL
    trust_score: float  # 0 - 100
    matched_investors: List[InvestorProfileItem]
    matched_schemes: List[GovtSchemeMatchItem]


class NDARequest(BaseModel):
    investor_id: str
    profile_id: str
    ip_title: str


class NDAResponse(BaseModel):
    nda_id: str
    status: str  # EXECUTED | PENDING_SIGNATURE
    signed_at: str
    nda_document_text: str
    dealroom_access_token: str


# ============================================================
# Smart IoT Compliance Schemas (/api/iot/*)
# ============================================================


class TelemetryIngestRequest(BaseModel):
    device_id: str = Field(..., example="ESP32-001")
    timestamp: Optional[str] = Field(None, example="2026-08-23T10:30:00Z")
    temperature: float = Field(..., example=28.4)
    humidity: float = Field(..., example=61.0)
    sound: float = Field(..., example=42.0)


class IOTDeviceSchema(BaseModel):
    id: Optional[str] = None
    device_id: str
    name: str = "ESP32-001 Processing Monitor"
    device_type: str = "Processing Monitor"
    status: str = "ONLINE"  # ONLINE | OFFLINE
    wifi_status: str = "Connected"
    sampling_interval_sec: int = 5
    last_seen: str
    temperature: float = 28.4
    humidity: float = 61.0
    sound: float = 42.0
    compliance_status: str = "NORMAL"  # NORMAL | ATTENTION | DEVIATION


class IOTRuleSchema(BaseModel):
    id: Optional[str] = None
    device_id: str = "ESP32-001"
    temp_min: float = 20.0
    temp_max: float = 30.0
    humidity_min: float = 40.0
    humidity_max: float = 70.0
    sound_max: float = 70.0


class IOTEventSchema(BaseModel):
    id: Optional[str] = None
    event_id: str
    device_id: str
    timestamp: str
    event_type: str = "MONITORING_LOG"  # START | LOG | DEVIATION | RECOVERY
    parameter: Optional[str] = None
    observed_value: Optional[str] = None
    configured_range: Optional[str] = None
    status: str = "NORMAL"  # NORMAL | ATTENTION | DEVIATION
    acknowledged: bool = False


class IOTEvidenceSchema(BaseModel):
    id: Optional[str] = None
    evidence_id: str
    event_id: str
    device_id: str
    timestamp: str
    temperature: float
    humidity: float
    sound: float
    status: str
    rule_id: str = "ENV-HUM-001"
    integrity_hash: str


class IOTDeviceProductLinkSchema(BaseModel):
    id: Optional[str] = None
    device_id: str = "ESP32-001"
    product_name: str = "Herbal Extract A"
    process_name: str = "Controlled Drying"
    monitoring_purpose: str = "Environmental process monitoring for quality evidence"
    passport_id: Optional[str] = None


class IOTSummaryResponse(BaseModel):
    device: IOTDeviceSchema
    current_rule: IOTRuleSchema
    link: IOTDeviceProductLinkSchema
    compliance_status: str  # NORMAL | ATTENTION | DEVIATION
    latest_event: Optional[IOTEventSchema] = None
    unacknowledged_alerts_count: int = 0
    demo_mode: bool = True

