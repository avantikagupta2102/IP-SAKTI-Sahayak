"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  BookOpen,
  Filter,
  Search,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Award,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  BusinessProfile,
  RegulationItem,
  getProfiles,
  getRegulations,
  getRegulationsImpact,
} from "@/lib/api";

const IMPACT_LEVELS = ["ALL", "CRITICAL", "HIGH", "MODERATE"];

export default function RegulationsPage() {
  const router = useRouter();

  // Profiles State
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [activeProfile, setActiveProfile] = useState<BusinessProfile | null>(null);

  // Regulations Data State
  const [regulations, setRegulations] = useState<RegulationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImpact, setSelectedImpact] = useState("ALL");

  // Load profiles on mount
  useEffect(() => {
    async function loadProfiles() {
      try {
        const profs = await getProfiles();
        setProfiles(profs);
        if (profs.length > 0 && profs[0].id) {
          setSelectedProfileId(profs[0].id);
          setActiveProfile(profs[0]);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    }
    loadProfiles();
  }, []);

  // Load or filter regulations whenever profile selection changes
  useEffect(() => {
    async function fetchRegs() {
      setIsLoading(true);
      try {
        if (selectedProfileId) {
          const impactRes = await getRegulationsImpact(selectedProfileId);
          setRegulations(impactRes.regulations);
          const found = profiles.find((p) => p.id === selectedProfileId);
          if (found) setActiveProfile(found);
        } else {
          const res = await getRegulations();
          setRegulations(res.regulations);
          setActiveProfile(null);
        }
      } catch (err) {
        console.error("Failed to load regulations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRegs();
  }, [selectedProfileId, profiles]);

  // Client-side search & impact filtering
  const filteredRegulations = regulations.filter((reg) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      reg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.key_provisions.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesImpact = selectedImpact === "ALL" || reg.impact_level.toUpperCase() === selectedImpact;

    return matchesSearch && matchesImpact;
  });

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  Statutory Regulations Repository
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-semibold text-slate-500">Official Indian IP &amp; AYUSH Acts</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">IP &amp; AYUSH Regulatory Guidance</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Explore core Indian Intellectual Property acts, AYUSH examination guidelines, Section 3(p) non-patentability rules, and Biodiversity Act disclosures. Filter regulations by your company's profile to rank by direct statutory impact.
              </p>
            </div>

            {/* Profile Impact Filter Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[280px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-700" />
                <span>Profile Relevance Filter</span>
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">All Regulations (Unfiltered)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.company_name} ({p.sector})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Profile Filter Context Indicator */}
          {activeProfile && (
            <div className="p-3.5 bg-emerald-950 text-white rounded-xl flex items-center justify-between gap-3 text-xs border border-emerald-800 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Showing regulations ranked by relevance for <strong>{activeProfile.company_name}</strong> ({activeProfile.sector} Sector • {activeProfile.ip_assets.length} IP Assets Logged)
                </span>
              </div>
              <button
                onClick={() => setSelectedProfileId("")}
                className="text-[11px] text-emerald-300 hover:text-white underline font-semibold"
              >
                Clear Profile Filter
              </button>
            </div>
          )}

          {/* Search Bar & Impact Level Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search acts, sections, authorities, or rules..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              />
            </div>

            {/* Impact Level Chips */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter size={14} />
                <span>Impact:</span>
              </span>
              {IMPACT_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedImpact(lvl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedImpact === lvl
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Regulations List Grid */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <RefreshCw size={32} className="mx-auto text-emerald-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Ranking IP regulations by profile impact...</p>
            </div>
          ) : filteredRegulations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No regulations match your search query.</p>
              <button onClick={() => { setSearchQuery(""); setSelectedImpact("ALL"); }} className="text-xs font-bold text-emerald-700 underline">
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRegulations.map((reg) => (
                <div key={reg.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Top Meta Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg truncate max-w-[240px]">
                        {reg.authority}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${
                          reg.impact_level === "CRITICAL"
                            ? "bg-rose-100 text-rose-900 border border-rose-300"
                            : reg.impact_level === "HIGH"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-blue-100 text-blue-900 border border-blue-300"
                        }`}
                      >
                        {reg.impact_level} IMPACT
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-slate-900 leading-snug">{reg.title}</h3>

                    {/* Profile Relevance Score Badge (when active) */}
                    {reg.relevance_score !== undefined && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Award size={16} className="text-emerald-700 flex-shrink-0" />
                          <span className="font-bold text-emerald-900">{reg.relevance_score}% Profile Match</span>
                        </div>
                        <span className="text-[11px] text-emerald-800 truncate font-medium max-w-[200px]" title={reg.relevance_reason}>
                          {reg.relevance_reason}
                        </span>
                      </div>
                    )}

                    {/* Summary */}
                    <p className="text-xs text-slate-600 leading-relaxed">{reg.summary}</p>

                    {/* Key Statutory Provisions */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Key Statutory Provisions:</p>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {reg.key_provisions.map((prov, pidx) => (
                          <li key={pidx} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span className="leading-snug">{prov}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {/* Applicability Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400 font-medium">Applies to:</span>
                      {reg.asset_types.map((ast) => (
                        <span key={ast} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                          {ast}
                        </span>
                      ))}
                      {reg.sectors.slice(0, 3).map((sec) => (
                        <span key={sec} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold border border-emerald-200">
                          {sec}
                        </span>
                      ))}
                    </div>

                    {/* Ask AI Advisor Button */}
                    <button
                      onClick={() =>
                        router.push(
                          `/chat?prompt=${encodeURIComponent(
                            `Explain how ${reg.title} (${reg.official_reference}) impacts my company and what key compliance steps I must take.`
                          )}`
                        )
                      }
                      className="w-full py-2.5 bg-slate-900 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-2xs"
                    >
                      <Sparkles size={14} className="text-emerald-400" />
                      <span>Ask AI Advisor on this Regulation</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
