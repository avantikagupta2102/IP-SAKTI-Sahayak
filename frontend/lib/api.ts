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
