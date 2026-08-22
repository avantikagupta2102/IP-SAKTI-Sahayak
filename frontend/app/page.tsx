"use client";

import { useState, useMemo, useCallback } from "react";
import { RefreshCw, ScanLine, ChevronDown } from "lucide-react";

import AppSidebar from "@/components/dashboard/AppSidebar";
import StatGrid from "@/components/dashboard/StatGrid";
import RiskCard from "@/components/dashboard/RiskCard";
import Inspector from "@/components/dashboard/Inspector";
import ScanModal from "@/components/dashboard/ScanModal";

import {
  RISKS,
  Risk,
  Category,
  Priority,
  getStats,
  daysUntil,
} from "@/lib/risk-data";

type NavItem = "Risk Radar" | "Document Vault" | "Compliance Analytics" | "Expert Queue";
type CategoryFilter = "All Risks" | Category;

const CATEGORIES: CategoryFilter[] = [
  "All Risks",
  "IP & Patents",
  "Advertisement & Claims",
  "Licensing & Renewals",
];

const PRIORITIES: ("All" | Priority)[] = ["All", "HIGH", "MEDIUM", "LOW"];

export default function DashboardPage() {
  const [nav, setNav] = useState<NavItem>("Risk Radar");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All Risks");
  const [priorityFilter, setPriorityFilter] = useState<"All" | Priority>("All");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [risks, setRisks] = useState<Risk[]>(RISKS);
  const [showScan, setShowScan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPriorityDrop, setShowPriorityDrop] = useState(false);

  const handleEscalate = useCallback((id: string) => {
    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, escalated: true } : r))
    );
    if (selectedRisk?.id === id) {
      setSelectedRisk((prev) => prev ? { ...prev, escalated: true } : prev);
    }
  }, [selectedRisk]);

  const handleScanComplete = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      const catOk = categoryFilter === "All Risks" || r.category === categoryFilter;
      const priOk = priorityFilter === "All" || r.priority === priorityFilter;
      return catOk && priOk;
    });
  }, [risks, categoryFilter, priorityFilter]);

  const stats = useMemo(() => getStats(risks), [risks]);
  const highCount = risks.filter((r) => r.priority === "HIGH").length;
  const mediumCount = risks.filter((r) => r.priority === "MEDIUM").length;
  const urgentRisk = risks.find((r) => daysUntil(r.deadline) <= 45 && r.priority === "HIGH");

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden font-sans">
      {/* ── Sidebar ─────────────────────────────── */}
      <AppSidebar activeNav={nav} onNavChange={setNav} />

      {/* ── Main area ───────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Topbar ────────────────────────────── */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-base font-bold text-slate-900 leading-tight">
                Risk Radar
              </h1>
              <p className="text-xs text-slate-400">
                Product #AY-2026-X · last scan 22 Aug 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-slate-600 font-medium border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
              Switch profile
            </button>
            <button
              onClick={() => setShowScan(true)}
              className="flex items-center gap-1.5 text-sm text-white font-semibold bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              <ScanLine size={14} />
              Scan new product
            </button>
          </div>
        </header>

        {/* ── Content (scroll area) ─────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel: stats + feed */}
          <div className="flex-1 overflow-y-auto px-8 py-6">

            {/* Stat grid */}
            <StatGrid
              stats={stats}
              highCount={highCount}
              mediumCount={mediumCount}
              urgentLabel={urgentRisk ? `Form 25-D · ${daysUntil(urgentRisk.deadline)} days left` : undefined}
            />

            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              {/* Category tabs */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap ${
                      categoryFilter === cat
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Priority dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowPriorityDrop((v) => !v)}
                  className="flex items-center gap-2 text-sm text-slate-600 font-medium border border-slate-200 bg-white px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="21" y1="10" x2="7" y2="10" />
                    <line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" />
                    <line x1="21" y1="18" x2="7" y2="18" />
                  </svg>
                  {priorityFilter === "All" ? "All priorities" : priorityFilter}
                  <ChevronDown size={13} />
                </button>
                {showPriorityDrop && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPriorityFilter(p); setShowPriorityDrop(false); }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                          priorityFilter === p
                            ? "text-emerald-700 font-semibold bg-emerald-50"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p === "All" ? "All priorities" : p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Risk feed */}
            <div className="flex flex-col gap-3">
              {loading ? (
                // Skeleton cards
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="flex gap-2">
                        <div className="h-5 w-16 bg-slate-100 rounded-full" />
                        <div className="h-5 w-24 bg-slate-100 rounded-full" />
                      </div>
                      <div className="h-7 w-8 bg-slate-100 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                    <div className="h-3 w-full bg-slate-100 rounded mb-4" />
                    <div className="h-1.5 w-full bg-slate-100 rounded" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No risks match your filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try changing the category or priority filter.</p>
                  <button
                    onClick={() => { setCategoryFilter("All Risks"); setPriorityFilter("All"); }}
                    className="mt-4 text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                filtered.map((risk) => (
                  <RiskCard
                    key={risk.id}
                    risk={risk}
                    isSelected={selectedRisk?.id === risk.id}
                    onClick={() =>
                      setSelectedRisk((prev) => prev?.id === risk.id ? null : risk)
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Inspector panel ───────────────────── */}
          <aside className="w-[380px] flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto">
            <Inspector risk={selectedRisk} onEscalate={handleEscalate} />
          </aside>
        </div>
      </div>

      {/* ── Scan modal ─────────────────────────── */}
      {showScan && (
        <ScanModal
          onClose={() => setShowScan(false)}
          onComplete={handleScanComplete}
        />
      )}
    </div>
  );
}
