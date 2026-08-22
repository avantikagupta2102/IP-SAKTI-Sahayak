"use client";

import { ChatResponse } from "@/lib/api";
import ActionCard from "./ActionCard";
import ConfidenceBadge from "./ConfidenceBadge";
import SourceCard from "./SourceCard";
import { submitFeedback } from "@/lib/api";
import { useState } from "react";

interface UserMessage {
  role: "user";
  text: string;
  id: string;
}

interface AssistantMessage {
  role: "assistant";
  id: string;
  data: ChatResponse;
}

export type Message = UserMessage | AssistantMessage;

interface Props {
  message: Message;
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-indigo-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed shadow-lg">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ data }: { data: ChatResponse }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const lowConfidence = data.confidence === "LOW";

  const handleFeedback = async (r: 1 | -1) => {
    setRating(r);
    setFeedbackSent(true);
    try {
      await submitFeedback({ message_id: data.message_id, rating: r, comment: comment || undefined });
    } catch (e) {
      console.warn("Feedback submission failed", e);
    }
  };

  const handleSendComment = async () => {
    if (!rating) return;
    try {
      await submitFeedback({ message_id: data.message_id, rating: rating, comment: comment });
      setFeedbackSent(true);
    } catch (e) {
      console.warn("Comment submission failed", e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Low confidence banner */}
      {lowConfidence && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <span className="text-rose-400 text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
          <p className="text-sm text-rose-300">
            <strong>Insufficient evidence found.</strong> The knowledge base does not contain enough
            information to fully answer this question. Please consult the official sources directly
            and consider rephrasing your question.
          </p>
        </div>
      )}

      {/* Answer text */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl rounded-tl-sm px-5 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              S
            </span>
            <span className="text-xs font-semibold text-slate-400">IP-SAKTI Sahayak</span>
          </div>
          <ConfidenceBadge
            confidence={data.confidence}
            score={data.confidence_score}
          />
        </div>

        {/* Answer */}
        <div
          className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap prose-answer"
          dangerouslySetInnerHTML={{ __html: formatAnswer(data.answer) }}
        />

        {/* Feedback */}
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Was this helpful?</span>
            <button
              onClick={() => handleFeedback(1)}
              className={`text-sm transition-all ${
                rating === 1 ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80"
              }`}
              aria-label="Thumbs up"
              id={`thumbs-up-${data.message_id}`}
            >
              👍
            </button>
            <button
              onClick={() => handleFeedback(-1)}
              className={`text-sm transition-all ${
                rating === -1 ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80"
              }`}
              aria-label="Thumbs down"
              id={`thumbs-down-${data.message_id}`}
            >
              👎
            </button>
            {feedbackSent && (
              <span className="text-xs text-slate-400 ml-1">Thanks for your feedback!</span>
            )}
          </div>

          {rating !== null && (
            <div className="flex gap-2 text-xs pt-1">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional feedback comment..."
                className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
              <button
                onClick={handleSendComment}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors flex-shrink-0"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sources */}
      {data.sources.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Sources
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.sources.map((source, i) => (
              <SourceCard key={source.id} source={source} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(data.actions.length > 0) && (
        <ActionCard actions={data.actions} />
      )}
    </div>
  );
}

/** Convert simple markdown-like syntax to HTML for the answer. */
function formatAnswer(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^(\d+)\.\s/gm, '<span class="text-indigo-400 font-semibold">$1.</span> ')
    .replace(/^[-•]\s/gm, '<span class="text-slate-500 mr-1">·</span>')
    .replace(/\n/g, "<br/>");
}

export default function ChatMessage({ message }: Props) {
  if (message.role === "user") {
    return <UserBubble text={message.text} />;
  }
  return <AssistantBubble data={message.data} />;
}
