"use client";

import { SourceRef } from "@/lib/api";

interface Props {
  source: SourceRef;
  index: number;
}

const AUTHORITY_COLORS: Record<string, string> = {
  "IP India": "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  "Ministry of AYUSH": "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  WIPO: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  TKDL: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
};

const AUTHORITY_DOTS: Record<string, string> = {
  "IP India": "bg-blue-400",
  "Ministry of AYUSH": "bg-emerald-400",
  WIPO: "bg-violet-400",
  TKDL: "bg-amber-400",
};

export default function SourceCard({ source, index }: Props) {
  const colorClass =
    AUTHORITY_COLORS[source.authority ?? ""] ??
    "from-slate-500/20 to-slate-600/10 border-slate-500/30";
  const dotClass = AUTHORITY_DOTS[source.authority ?? ""] ?? "bg-slate-400";

  return (
    <a
      href={source.url ?? "#"}
      target={source.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={`source-card bg-gradient-to-br ${colorClass} border rounded-xl p-3 flex flex-col gap-1 hover:scale-[1.02] transition-transform duration-200 cursor-pointer group`}
      title={source.title}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          [{index}]
        </span>
        {source.relevance_score !== undefined && (
          <span className="text-[10px] text-slate-500 tabular-nums">
            {Math.round(source.relevance_score * 100)}% match
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">
        {source.title}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-1">
        {source.authority && (
          <span className="flex items-center gap-1 text-[11px] text-slate-300">
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />
            {source.authority}
          </span>
        )}
        {source.document_type && (
          <span className="text-[10px] text-slate-500 capitalize">
            · {source.document_type}
          </span>
        )}
        {source.url && (
          <span className="ml-auto text-[10px] text-blue-400 group-hover:text-blue-300 transition-colors">
            ↗
          </span>
        )}
      </div>
    </a>
  );
}
