"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  UploadCloud,
  FileText,
  ExternalLink,
  Shield,
  Leaf,
  Scale,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  X
} from "lucide-react";

import {
  sendChat,
  analyzeDocument,
  uploadDocument,
  ChatResponse,
  SourceRef,
  Action
} from "@/lib/api";

// ── Sample Quick Suggestions for Indian IP & AYUSH ────────────
const QUICK_PROMPTS = [
  {
    icon: "🌿",
    label: "Patent an Herbal Mix",
    query: "Can I patent an Ayurvedic formulation with Ashwagandha and Guduchi under Indian law?"
  },
  {
    icon: "™️",
    label: "Trademark Objection",
    query: "I received a Section 9(1)(a) objection for my brand name. How should I respond?"
  },
  {
    icon: "📜",
    label: "AYUSH Label Claims",
    query: "What health benefit claims are permissible on an Ayurvedic OTC product label?"
  },
  {
    icon: "📋",
    label: "Form 25-D Renewal",
    query: "What documents and inspection certificates are needed to renew an AYUSH manufacturing licence?"
  }
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  confidence?: string;
  confidenceScore?: number;
  actions?: Action[];
  timestamp: string;
  docAnalysis?: {
    docType: string;
    summary: string;
    deadline?: string;
  };
}

export default function UnifiedApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<SourceRef | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ── Handle Sending a Prompt ─────────────────────────────────
  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    setInputQuery("");
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const resp: ChatResponse = await sendChat({
        query: text,
        conversation_id: conversationId
      });

      if (!conversationId && resp.conversation_id) {
        setConversationId(resp.conversation_id);
      }

      const assistantMsg: Message = {
        id: resp.message_id || `bot-${Date.now()}`,
        role: "assistant",
        content: resp.answer,
        sources: resp.sources,
        confidence: resp.confidence,
        confidenceScore: resp.confidence_score,
        actions: resp.actions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (resp.sources && resp.sources.length > 0) {
        setSelectedEvidence(resp.sources[0]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Notice:** ${err.message || "Failed to reach the backend server. Please ensure the backend is running at http://localhost:8000."}`,
        confidence: "LOW",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Document Upload & Analysis ───────────────────────
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setShowUploadModal(false);

    const userMsg: Message = {
      id: `doc-${Date.now()}`,
      role: "user",
      content: `📄 Uploaded document for compliance analysis: **${file.name}**`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // 1. Upload
      const uploadResp = await uploadDocument(file);
      
      // 2. Analyze
      const analysisResp = await analyzeDocument({
        document_id: uploadResp.document_id,
        question: "Analyze this regulatory document. Identify the document type, legal sections, compliance obligations, and next steps."
      });

      const assistantMsg: Message = {
        id: `analysis-${Date.now()}`,
        role: "assistant",
        content: analysisResp.answer || analysisResp.summary.summary,
        sources: analysisResp.sources,
        confidence: analysisResp.confidence,
        confidenceScore: analysisResp.confidence_score,
        actions: analysisResp.requirements?.map((req, i) => ({
          step: i + 1,
          description: req,
          required_documents: []
        })),
        docAnalysis: {
          docType: analysisResp.summary.doc_type,
          summary: analysisResp.summary.summary,
          deadline: analysisResp.deadline?.deadline_date
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (analysisResp.sources && analysisResp.sources.length > 0) {
        setSelectedEvidence(analysisResp.sources[0]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Document Analysis Note:** ${err.message || "Could not complete document scan. Check backend connection."}`,
          confidence: "LOW",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-dvh bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* ── 1. LEFT SIDEBAR: App Identity & Navigation ──────── */}
      <aside className="w-64 bg-[#0c1911] text-white flex flex-col justify-between p-4 flex-shrink-0 border-r border-emerald-950">
        <div>
          {/* Logo & Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
              <Leaf size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">IP-SAKTI Sahayak</h1>
              <p className="text-[11px] text-emerald-400">Explainable IP & AYUSH Advisor</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-1.5 mb-6">
            <button
              onClick={() => setMessages([])}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-emerald-700/40 text-emerald-300 border border-emerald-600/50 transition-colors"
            >
              <Sparkles size={18} className="text-emerald-400" />
              <span>Ask IP Question</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-transparent"
            >
              <UploadCloud size={18} />
              <span>Upload Notice / PDF</span>
            </button>
          </div>

          {/* Active Product Context */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Profile</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm font-bold text-white mb-0.5">Product #AY-2026-X</p>
            <p className="text-xs text-slate-400">Ayurvedic Formulation</p>
          </div>
        </div>

        {/* Engine status footer */}
        <div className="border-t border-white/10 pt-4 px-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield size={14} className="text-emerald-400 flex-shrink-0" />
            <span>Local Ollama + FAISS Engine</span>
          </div>
        </div>
      </aside>

      {/* ── 2. CENTER PANEL: Chat & Prompt Interface ────────── */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
        
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">Explainable IP & AYUSH Consultation</h2>
            <p className="text-xs text-slate-500">Ask any legal question or upload a government notice for grounded next steps.</p>
          </div>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} />
            <span>New Chat</span>
          </button>
        </header>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            /* Welcome / Quick Prompts Screen */
            <div className="max-w-2xl mx-auto my-auto text-center py-10">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">How can IP-SAKTI Sahayak assist your AYUSH product today?</h3>
              <p className="text-sm text-slate-600 mb-8 max-w-lg mx-auto">
                Ask any question about Indian patent eligibility, trademark registration, AYUSH Drug Licence Form 25-D, or label compliance under Rule 161.
              </p>

              {/* 4 Clickable Quick Prompts */}
              <div className="grid grid-cols-2 gap-3 text-left">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.query)}
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-semibold text-xs text-slate-900 group-hover:text-emerald-700">{item.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.query}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message History */
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-xs ${
                      msg.role === "user"
                        ? "bg-emerald-700 text-white rounded-br-none"
                        : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                    }`}
                  >
                    {/* Role header for assistant */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                            IP
                          </span>
                          <span className="text-xs font-bold text-slate-800">IP-SAKTI Sahayak Response</span>
                        </div>
                        {msg.confidence && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              msg.confidence === "HIGH"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : msg.confidence === "MEDIUM"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            Confidence: {msg.confidence}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </div>

                    {/* Actionable Next Steps */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Recommended Action Steps:</span>
                        </p>
                        <div className="space-y-1.5">
                          {msg.actions.map((act, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="font-bold text-emerald-700 flex-shrink-0">{i + 1}.</span>
                              <span>{act.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources Badge Row */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Cited Evidence:</span>
                        {msg.sources.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedEvidence(src)}
                            className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                          >
                            📖 {src.title || src.id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl max-w-xs shadow-xs animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 animate-spin flex items-center justify-center text-white text-[10px]">
                    ⚙️
                  </div>
                  <span className="text-xs font-medium text-slate-600">Retrieving citations & analyzing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Prompt Input Box */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="max-w-3xl mx-auto relative flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
              title="Upload official notice or label PDF"
            >
              <UploadCloud size={20} />
            </button>

            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about patentability, trademark class, AYUSH licensing, or label claims..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl flex items-center gap-1.5 text-sm transition-colors shadow-xs"
            >
              <span>Ask</span>
              <Send size={15} />
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            IP-SAKTI Sahayak provides informational guidance grounded in verified official sources. Not a substitute for legal advice.
          </p>
        </div>
      </main>

      {/* ── 3. RIGHT PANEL: Evidence & Explainability Inspector ─ */}
      <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-5 overflow-y-auto flex-shrink-0">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Scale size={18} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Explainable Legal Evidence</h3>
        </div>

        {selectedEvidence ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  {selectedEvidence.authority || "Official Regulatory Source"}
                </span>
                {selectedEvidence.url && (
                  <a
                    href={selectedEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900"
                    title="Open official portal"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 mb-2">
                {selectedEvidence.title || "Statutory Reference"}
              </p>
              {selectedEvidence.document_type && (
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-700 mb-2">
                  {selectedEvidence.document_type}
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={14} className="text-emerald-600" />
                <span>Verification Guarantee:</span>
              </p>
              <p className="text-slate-600 leading-relaxed">
                This excerpt is extracted directly from the verified government gazette stored in the local vector knowledge base.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 space-y-2 my-auto">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-medium">No citation selected</p>
            <p className="text-[11px] text-slate-400 max-w-[180px] mx-auto">
              Ask a question to inspect the verified Indian legal clauses and evidence citations.
            </p>
          </div>
        )}
      </aside>

      {/* ── 4. UPLOAD MODAL ───────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-up">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">Upload Document for Analysis</h3>
            <p className="text-xs text-slate-500 mb-4">
              Drop a Trademark Examination Report, Patent Notice, or Label artwork (PDF).
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <UploadCloud size={36} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800">Click to browse or drop PDF here</p>
              <p className="text-xs text-slate-400 mt-1">Supports PDF up to 20MB</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
