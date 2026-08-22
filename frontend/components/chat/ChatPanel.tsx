"use client";

import { useState, useRef, useEffect } from "react";
import { Send, UploadCloud, Sparkles, Mic, MicOff, RefreshCw, X, Scale, Shield, ExternalLink, FileText } from "lucide-react";
import { sendChat, uploadDocument, analyzeDocument, SourceRef, ChatResponse } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { upsertSession, makeTitle, getSession } from "@/lib/history";
import LanguageSelector from "@/components/shared/LanguageSelector";
import MessageBubble from "./MessageBubble";

const QUICK_PROMPTS = [
  { icon: "🌿", label: "Patent an Herbal Mix", query: "Can I patent an Ayurvedic formulation with Ashwagandha and Guduchi under Indian law?" },
  { icon: "™️", label: "Trademark Objection", query: "I received a Section 9(1)(a) objection for my brand name. How should I respond?" },
  { icon: "📜", label: "AYUSH Label Claims", query: "What health benefit claims are permissible on an Ayurvedic OTC product label?" },
  { icon: "📋", label: "Form 25-D Renewal", query: "What documents and inspection certificates are needed to renew an AYUSH manufacturing licence?" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  confidence?: string;
  confidenceScore?: number;
  actions?: any[];
  timestamp: string;
  detectedLanguage?: string;
}

interface Props {
  initialPrompt?: string | null;
  sessionId?: string | null;
}

export default function ChatPanel({ initialPrompt, sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>(getUser()?.language || "en");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(sessionId || undefined);
  const [isListening, setIsListening] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<SourceRef | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Restore session from localStorage if sessionId is given
  useEffect(() => {
    if (sessionId) {
      const stored = getSession(sessionId);
      if (stored) {
        setMessages(stored.messages);
        setConversationId(stored.id);
      }
    }
  }, [sessionId]);

  // Auto-send initial prompt if provided via URL
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isLoading) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice speech-to-text recognition setup
  const toggleVoice = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getUser()?.language === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInputQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Handle message sending
  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    setInputQuery("");
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const resp: ChatResponse = await sendChat({
        query: text,
        conversation_id: conversationId,
        language: selectedLang,
      });

      const currentConvId = conversationId || resp.conversation_id;
      if (!conversationId) {
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
        detectedLanguage: resp.detected_language,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const updated = [...newMessages, assistantMsg];
      setMessages(updated);

      if (resp.sources && resp.sources.length > 0) {
        setSelectedEvidence(resp.sources[0]);
      }

      // Persist session to localStorage
      upsertSession({
        id: currentConvId,
        title: makeTitle(newMessages[0].content),
        createdAt: new Date().toISOString(),
        messages: updated,
      });

    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Notice:** ${err.message || "Could not connect to Ollama backend. Please ensure uvicorn is running."}`,
        confidence: "LOW",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle PDF upload and analysis
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setShowUploadModal(false);

    const userMsg: Message = {
      id: `doc-${Date.now()}`,
      role: "user",
      content: `📄 Uploaded document for compliance analysis: **${file.name}**`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const uploadResp = await uploadDocument(file);
      const userObj = getUser();
      const analysisResp = await analyzeDocument({
        document_id: uploadResp.document_id,
        question: "Analyze this document for legal compliance, risks, and required actions.",
        language: userObj?.language || "en",
      });

      const assistantMsg: Message = {
        id: `analysis-${Date.now()}`,
        role: "assistant",
        content: analysisResp.answer || analysisResp.summary.summary,
        sources: analysisResp.sources,
        confidence: analysisResp.confidence,
        actions: analysisResp.requirements?.map((req, i) => ({ step: i + 1, description: req, required_documents: [] })),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          content: `⚠️ **Upload Note:** ${err.message || "Failed to process document."}`,
          confidence: "LOW",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto my-auto text-center py-10">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Sparkles size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">How can IP-SAKTI Sahayak assist your AYUSH product?</h3>
              <p className="text-sm text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
                Type a question or pick a quick starter topic below to receive cited guidance grounded in Indian legal gazettes.
              </p>

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
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  {...msg}
                  detectedLanguage={msg.detectedLanguage}
                  onSelectEvidence={(src) => setSelectedEvidence(src)}
                />
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl max-w-xs shadow-xs animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 animate-spin flex items-center justify-center text-white text-[10px]">
                    ⚙️
                  </div>
                  <span className="text-xs font-medium text-slate-600">Retrieving citations &amp; analyzing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="max-w-3xl mx-auto flex items-center gap-2"
          >
            {/* Upload document button */}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
              title="Upload document PDF"
            >
              <UploadCloud size={20} />
            </button>

            {/* Voice input button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`p-2.5 rounded-xl transition-colors ${
                isListening
                  ? "bg-rose-100 text-rose-600 animate-pulse"
                  : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
              }`}
              title={isListening ? "Listening..." : "Speak question"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Language Selector */}
            <LanguageSelector
              value={selectedLang}
              onChange={(lang) => setSelectedLang(lang)}
              className="hidden sm:inline-block"
            />

            {/* Query Text Input */}
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isListening ? "Listening to your voice..." : "Ask about patentability, trademark class, AYUSH licensing..."}
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
      </div>

      {/* ── Evidence Inspector Right Panel ── */}
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
                This statutory excerpt is cited directly from verified Indian legislation in the vector store.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 space-y-2 my-auto">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-medium">No citation selected</p>
            <p className="text-[11px] text-slate-400 max-w-[180px] mx-auto leading-relaxed">
              Ask a question or click a citation badge to inspect the verified Indian legal clauses.
            </p>
          </div>
        )}
      </aside>

      {/* ── Document Upload Modal ── */}
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
