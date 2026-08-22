"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatInput from "@/components/ChatInput";
import ChatMessage, { Message } from "@/components/ChatMessage";
import UploadZone from "@/components/UploadZone";
import {
  analyzeDocument,
  getSources,
  sendChat,
  SourceListItem,
  UploadResponse,
} from "@/lib/api";

// ============================================================
// Quick-action chips
// ============================================================
const QUICK_ACTIONS = [
  { label: "Patent Filing", emoji: "🔬", query: "How do I file a patent application in India? What are the steps and fees?" },
  { label: "Trademark", emoji: "™️", query: "How do I register a trademark for my AYUSH brand in India?" },
  { label: "Copyright", emoji: "©️", query: "How do I protect my creative work with copyright in India?" },
  { label: "AYUSH Startup", emoji: "🌿", query: "What IP protections are available for an AYUSH startup's formulations and brand?" },
  { label: "PCT Application", emoji: "🌍", query: "How can an Indian inventor file an international patent via PCT?" },
  { label: "TK Protection", emoji: "📜", query: "How does India protect Traditional Knowledge from biopiracy?" },
];

// ============================================================
// Skeleton loading state
// ============================================================
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full skeleton" />
        <div className="h-3 w-28 skeleton" />
      </div>
      <div className="h-3 w-full skeleton" />
      <div className="h-3 w-5/6 skeleton" />
      <div className="h-3 w-4/6 skeleton" />
      <div className="h-3 w-3/6 skeleton mt-1" />
    </div>
  );
}

// ============================================================
// Trusted sources strip
// ============================================================
function SourcesStrip({ sources }: { sources: SourceListItem[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-slate-500 flex-shrink-0">Trusted:</span>
      {sources.map((src) => (
        <a
          key={src.id}
          href={src.url ?? "#"}
          target={src.url ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex-shrink-0 text-xs text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 px-2.5 py-1 rounded-full transition-all duration-200"
        >
          {src.authority ?? src.title}
        </a>
      ))}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================
export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<UploadResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // Fetch trusted sources on mount
  useEffect(() => {
    getSources()
      .then((r) => setSources(r.sources))
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        role: "user",
        text,
        id: `user-${Date.now()}`,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const response = await sendChat({
          query: text,
          conversation_id: conversationId,
        });

        if (!conversationId) setConversationId(response.conversation_id);

        const assistantMsg: Message = {
          role: "assistant",
          id: response.message_id,
          data: response,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMsg: Message = {
          role: "assistant",
          id: `err-${Date.now()}`,
          data: {
            message_id: `err-${Date.now()}`,
            conversation_id: conversationId ?? "",
            answer: `⚠️ **Error:** ${(err as Error).message ?? "Something went wrong. Please try again."}`,
            sources: [],
            confidence: "LOW",
            confidence_score: 0,
            actions: [],
          },
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId]
  );

  const handleUpload = useCallback((response: UploadResponse) => {
    setPendingDoc(response);
    setShowUpload(false);
    // Auto-trigger analysis
    const userMsg: Message = {
      role: "user",
      text: `📄 Uploaded: **${response.filename}** (${response.page_count} pages)\n\nPlease analyze this document and explain what I need to do.`,
      id: `upload-${Date.now()}`,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    analyzeDocument({
      document_id: response.document_id,
      question: "Analyze this document and explain what it means and what I need to do next.",
    })
      .then((analysis) => {
        const assistantMsg: Message = {
          role: "assistant",
          id: `analyze-${Date.now()}`,
          data: {
            message_id: `analyze-${Date.now()}`,
            conversation_id: conversationId ?? "",
            answer: [
              `**Document Type:** ${analysis.summary.doc_type.replace(/_/g, " ")}`,
              "",
              analysis.summary.summary,
              analysis.answer ?? "",
            ]
              .filter(Boolean)
              .join("\n\n"),
            sources: analysis.sources,
            confidence: analysis.confidence as "HIGH" | "MEDIUM" | "LOW",
            confidence_score: analysis.confidence_score,
            actions: analysis.requirements.map((req, i) => ({
              step: i + 1,
              description: req,
              required_documents: [],
            })),
          },
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err) => {
        const errorMsg: Message = {
          role: "assistant",
          id: `err-${Date.now()}`,
          data: {
            message_id: `err-${Date.now()}`,
            conversation_id: conversationId ?? "",
            answer: `⚠️ Could not analyze the document: ${(err as Error).message}`,
            sources: [],
            confidence: "LOW",
            confidence_score: 0,
            actions: [],
          },
        };
        setMessages((prev) => [...prev, errorMsg]);
      })
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  const isFirstMessage = messages.length === 0;

  return (
    <div className="relative z-10 flex flex-col min-h-dvh max-h-dvh">
      {/* ---- Header ---- */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-4 glass border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              IP-SAKTI{" "}
              <span className="gradient-text">Sahayak</span>
            </h1>
            <p className="text-[11px] text-slate-500 leading-tight">
              Indian IP & AYUSH Regulatory Guidance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-xs text-slate-500 border border-slate-800 px-2.5 py-1 rounded-full">
            Grounded · Cited · Confidence-scored
          </span>
        </div>
      </header>

      {/* ---- Chat area ---- */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-32">
        {isFirstMessage ? (
          /* Hero / empty state */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6 animate-fade-up">
            <div className="space-y-3 max-w-xl">
              <p className="text-4xl sm:text-5xl font-bold text-white leading-tight">
                Navigate Indian IP{" "}
                <span className="gradient-text">with confidence</span>
              </p>
              <p className="text-slate-400 text-base">
                Ask about patents, trademarks, copyright, AYUSH regulations. Every
                answer is grounded in official sources with citations and next steps.
              </p>
            </div>

            {/* Quick-action chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className="chip"
                  onClick={() => sendMessage(action.query)}
                  id={`chip-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span aria-hidden="true">{action.emoji}</span>
                  {action.label}
                </button>
              ))}
            </div>

            {/* Trusted sources */}
            {sources.length > 0 && (
              <div className="w-full max-w-lg">
                <SourcesStrip sources={sources} />
              </div>
            )}
          </div>
        ) : (
          /* Message list */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-up">
                <ChatMessage message={msg} />
              </div>
            ))}
            {isLoading && (
              <div className="animate-fade-up">
                <LoadingSkeleton />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ---- Upload panel ---- */}
      {showUpload && (
        <div
          ref={uploadSectionRef}
          className="flex-shrink-0 px-4 sm:px-8 pb-3 max-w-3xl mx-auto w-full animate-fade-up"
        >
          <UploadZone onUploaded={handleUpload} />
        </div>
      )}

      {/* ---- Input bar ---- */}
      <div className="flex-shrink-0 px-4 sm:px-8 pb-16 pt-2 max-w-3xl mx-auto w-full">
        {/* Quick chips when conversation is ongoing */}
        {!isFirstMessage && !isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {QUICK_ACTIONS.slice(0, 3).map((action) => (
              <button
                key={action.label}
                className="chip text-[12px] py-1 px-3 flex-shrink-0"
                onClick={() => sendMessage(action.query)}
              >
                {action.emoji} {action.label}
              </button>
            ))}
          </div>
        )}

        <ChatInput
          onSend={sendMessage}
          onUploadClick={() => setShowUpload((v) => !v)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
