"use client";

import { useEffect, useState } from "react";
import { getAIHealth, AIHealthResponse } from "@/lib/api";

export default function StatusDot() {
  const [health, setHealth] = useState<AIHealthResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await getAIHealth();
        if (mounted) setHealth(res);
      } catch {
        if (mounted) {
          setHealth(null);
        }
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isOk = health?.status === "ready";
  const isModelMissing = health?.status === "model_missing";

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
      <span className="relative flex h-2 w-2">
        {isOk ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        )}
      </span>
      <span className="truncate max-w-[150px]">
        {isOk ? `Local AI • ${health.model}` : isModelMissing ? "Ollama running • model unavailable" : "Local AI unavailable"}
      </span>
    </div>
  );
}
