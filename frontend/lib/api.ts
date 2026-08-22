/**
 * lib/api.ts — Typed fetch wrappers for all IP-SAKTI Sahayak backend endpoints.
 */

// Direct URL to backend. CORS is configured on the backend to allow localhost:3000.
// We do NOT use Next.js rewrites because long Ollama calls (30s+) cause ECONNRESET.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ============================================================
// Types (mirror of backend Pydantic schemas)
// ============================================================

export interface SourceRef {
  id: string;
  title: string;
  authority?: string;
  url?: string;
  document_type?: string;
  relevance_score?: number;
}

export interface Action {
  step: number;
  description: string;
  required_documents: string[];
}

export interface ChatRequest {
  query: string;
  language?: string;
  conversation_id?: string;
}

export interface ChatResponse {
  message_id: string;
  conversation_id: string;
  answer: string;
  sources: SourceRef[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  confidence_score: number;
  actions: Action[];
  detected_language?: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  file_size: number;
  extracted_text_preview: string;
  page_count: number;
}

export interface DocumentSummary {
  doc_type: string;
  summary: string;
  deadline_date?: string;
  key_requirements: string[];
}

export interface DocumentAnalyzeRequest {
  document_id: string;
  question?: string;
  language?: string;
}

export interface DocumentAnalyzeResponse {
  document_id: string;
  summary: DocumentSummary;
  deadline?: { deadline_date?: string; description?: string };
  requirements: string[];
  sources: SourceRef[];
  confidence: string;
  confidence_score: number;
  answer?: string;
}

export interface SourceListItem {
  id: string;
  title: string;
  authority?: string;
  url?: string;
  document_type?: string;
  topic?: string;
  publication_date?: string;
}

export interface SourcesResponse {
  sources: SourceListItem[];
  total: number;
}

export interface FeedbackRequest {
  message_id: string;
  rating: 1 | -1;
  comment?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  llm_provider?: string;
  llm_model?: string;
  llm_configured: boolean;
  kb_chunk_count: number;
  message: string;
}

// ============================================================
// Business Profile & Compliance Passport Types
// ============================================================

export interface IPAsset {
  asset_type: "Patent" | "Trademark" | "GI" | "Copyright" | string;
  title: string;
  status: "Granted" | "Pending" | "Draft" | "Expired" | string;
  registration_no?: string;
}

export interface BusinessProfile {
  id?: string;
  company_name: string;
  sector: string;
  company_type: string;
  registration_number?: string;
  state?: string;
  ip_assets: IPAsset[];
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  item: string;
  status: "PASSED" | "WARNING" | "CRITICAL";
  guidance: string;
}

export interface AssetBreakdown {
  patents_count: number;
  trademarks_count: number;
  copyrights_count: number;
  gis_count: number;
  total_assets: number;
}

export interface CompliancePassport {
  profile_id: string;
  company_name: string;
  sector: string;
  company_type: string;
  overall_score: number;
  status_level: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "HIGH_RISK";
  asset_breakdown: {
    patents_count: number;
    trademarks_count: number;
    copyrights_count: number;
    gis_count: number;
    total_assets: number;
  };
  compliance_checklist: ChecklistItem[];
  recommended_actions: string[];
  next_filing_deadline?: string;
}

// ============================================================
// Core fetch helper
// ============================================================

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ============================================================
// API functions
// ============================================================

/** Ask a grounded question (POST /api/chat) */
export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Upload a PDF document (POST /api/upload) */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<UploadResponse>;
}

/** Analyze an uploaded document (POST /api/document/analyze) */
export async function analyzeDocument(
  request: DocumentAnalyzeRequest
): Promise<DocumentAnalyzeResponse> {
  return apiFetch<DocumentAnalyzeResponse>("/document/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** List all knowledge-base sources (GET /api/sources) */
export async function getSources(): Promise<SourcesResponse> {
  return apiFetch<SourcesResponse>("/sources", { method: "GET" });
}

/** Submit feedback (POST /api/feedback) */
export async function submitFeedback(
  request: FeedbackRequest
): Promise<{ ok: boolean; message_id: string }> {
  return apiFetch("/feedback", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getHealth(): Promise<HealthResponse> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");
  const res = await fetch(`${baseUrl}/health`);
  return res.json();
}

/** Create a new Business Profile */
export async function createProfile(data: BusinessProfile): Promise<BusinessProfile> {
  return apiFetch<BusinessProfile>("/profile", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** List all Business Profiles */
export async function getProfiles(): Promise<BusinessProfile[]> {
  return apiFetch<BusinessProfile[]>("/profile", { method: "GET" });
}

/** Get a Business Profile by ID */
export async function getProfile(id: string): Promise<BusinessProfile> {
  return apiFetch<BusinessProfile>(`/profile/${id}`, { method: "GET" });
}

/** Update an existing Business Profile */
export async function updateProfile(id: string, data: Partial<BusinessProfile>): Promise<BusinessProfile> {
  return apiFetch<BusinessProfile>(`/profile/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** Derive computed Compliance Passport for a profile */
export async function getCompliancePassport(id: string): Promise<CompliancePassport> {
  return apiFetch<CompliancePassport>(`/profile/${id}/passport`, { method: "GET" });
}

// ============================================================
// TKDL Risk Assessment Types & API Callers
// ============================================================

export interface IngredientInput {
  name: string;
  latin_name?: string;
  percentage?: number;
}

export interface TKRiskRequest {
  formulation_name: string;
  system: string;
  ingredients: IngredientInput[];
  proposed_claims?: string;
}

export interface TKMatchResult {
  ingredient_name: string;
  traditional_name: string;
  latin_name: string;
  system: string;
  tkdl_reference: string;
  classical_text_source: string;
  risk_factor: "HIGH_PRIOR_ART" | "MODERATE" | "LOW";
  known_therapeutic_use: string;
}

export interface TKRiskResponse {
  formulation_name: string;
  system: string;
  overall_risk_score: number;
  risk_level: "HIGH_RISK" | "MODERATE_RISK" | "LOW_RISK";
  matched_entries: TKMatchResult[];
  patentability_assessment: string;
  key_recommendations: string[];
  section_3p_compliance_status: string;
}

/** Assess Traditional Knowledge (TKDL) & Section 3(p) Patent Risk */
export async function assessTKRisk(request: TKRiskRequest): Promise<TKRiskResponse> {
  return apiFetch<TKRiskResponse>("/tk-risk/assess", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** Fetch list of reference AYUSH herbs for autocompletion */
export async function getReferenceHerbs(): Promise<string[]> {
  return apiFetch<string[]>("/tk-risk/reference-herbs", { method: "GET" });
}

// ============================================================
// IP Regulations & Impact Ranking Types & API Callers
// ============================================================

export interface RegulationItem {
  id: string;
  title: string;
  authority: string;
  sectors: string[];
  asset_types: string[];
  summary: string;
  impact_level: "CRITICAL" | "HIGH" | "MODERATE" | string;
  key_provisions: string[];
  official_reference: string;
  relevance_score?: number;
  relevance_reason?: string;
}

export interface RegulationsResponse {
  total: number;
  regulations: RegulationItem[];
}

export interface RegulationImpactResponse {
  profile_id: string;
  company_name: string;
  sector: string;
  company_type: string;
  total_matched: number;
  regulations: RegulationItem[];
}

/** Get complete curated list of core Indian IP & AYUSH regulations */
export async function getRegulations(): Promise<RegulationsResponse> {
  return apiFetch<RegulationsResponse>("/regulations", { method: "GET" });
}

/** Get regulations filtered and ranked by relevance to a given business profile */
export async function getRegulationsImpact(profileId: string): Promise<RegulationImpactResponse> {
  return apiFetch<RegulationImpactResponse>(`/regulations/impact?profile_id=${encodeURIComponent(profileId)}`, {
    method: "GET",
  });
}

// ============================================================
// Compliance Deadline Calendar Types & API Callers
// ============================================================

export interface ComplianceEvent {
  id: string;
  profile_id?: string;
  title: string;
  category: "PATENT" | "TRADEMARK" | "AYUSH_LICENSE" | "BIODIVERSITY" | "GENERAL" | string;
  due_date: string;
  status: "UPCOMING" | "OVERDUE" | "DONE" | string;
  description?: string;
  authority?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceEventCreate {
  profile_id?: string;
  title: string;
  category?: string;
  due_date: string;
  status?: string;
  description?: string;
  authority?: string;
}

export interface ComplianceEventUpdate {
  profile_id?: string;
  title?: string;
  category?: string;
  due_date?: string;
  status?: string;
  description?: string;
  authority?: string;
}

export interface CalendarEventsResponse {
  total: number;
  upcoming_count: number;
  overdue_count: number;
  done_count: number;
  events: ComplianceEvent[];
}

/** Create a new compliance deadline event */
export async function createCalendarEvent(data: ComplianceEventCreate): Promise<ComplianceEvent> {
  return apiFetch<ComplianceEvent>("/calendar/event", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** List compliance deadline events */
export async function getCalendarEvents(profileId?: string, status?: string): Promise<CalendarEventsResponse> {
  const query = new URLSearchParams();
  if (profileId) query.set("profile_id", profileId);
  if (status) query.set("status", status);
  const qStr = query.toString() ? `?${query.toString()}` : "";

  return apiFetch<CalendarEventsResponse>(`/calendar/event${qStr}`, { method: "GET" });
}

/** Update compliance deadline event details or status */
export async function updateCalendarEvent(id: string, data: ComplianceEventUpdate): Promise<ComplianceEvent> {
  return apiFetch<ComplianceEvent>(`/calendar/event/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Delete compliance deadline event by ID */
export async function deleteCalendarEvent(id: string): Promise<void> {
  return apiFetch<void>(`/calendar/event/${id}`, { method: "DELETE" });
}
