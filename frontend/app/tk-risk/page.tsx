"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  Leaf,
  ShieldAlert,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  FlaskConical,
  Scale,
  Cpu,
} from "lucide-react";
import {
  IngredientInput,
  TKRiskRequest,
  TKRiskResponse,
  assessTKRisk,
} from "@/lib/api";

const SYSTEMS = ["Ayurveda", "Siddha", "Unani", "Polyherbal"];

// Sample pre-configured formulations for fast testing
const SAMPLE_FORMULATIONS = [
  {
    name: "Ashwagandha & Guduchi Immunity Elixir",
    system: "Ayurveda",
    claims: "Boosts natural immunity, reduces stress, and enhances cellular longevity.",
    ingredients: [
      { name: "Ashwagandha", latin_name: "Withania somnifera", percentage: 45 },
      { name: "Guduchi / Giloy", latin_name: "Tinospora cordifolia", percentage: 35 },
      { name: "Tulsi", latin_name: "Ocimum sanctum", percentage: 20 },
    ],
  },
  {
    name: "Haridra & Neem Anti-Acne Cleanser",
    system: "Ayurveda",
    claims: "Purifies blood, clears dermal acne, and reduces skin inflammation.",
    ingredients: [
      { name: "Haridra / Turmeric", latin_name: "Curcuma longa", percentage: 50 },
      { name: "Nimba / Neem", latin_name: "Azadirachta indica", percentage: 50 },
    ],
  },
  {
    name: "Nilavembu Herbal Antipyretic Decoction",
    system: "Siddha",
    claims: "Relieves viral fevers, joint pains, and systemic inflammation.",
    ingredients: [
      { name: "Nilavembu", latin_name: "Andrographis paniculata", percentage: 60 },
      { name: "Tulsi", latin_name: "Ocimum sanctum", percentage: 40 },
    ],
  },
];

export default function TKRiskPage() {
  const router = useRouter();

  // Formulation Input State
  const [formulationName, setFormulationName] = useState(SAMPLE_FORMULATIONS[0].name);
  const [system, setSystem] = useState(SAMPLE_FORMULATIONS[0].system);
  const [proposedClaims, setProposedClaims] = useState(SAMPLE_FORMULATIONS[0].claims);
  const [ingredients, setIngredients] = useState<IngredientInput[]>(SAMPLE_FORMULATIONS[0].ingredients);

  // New Ingredient Add state
  const [newHerbName, setNewHerbName] = useState("");
  const [newHerbLatin, setNewHerbLatin] = useState("");
  const [newHerbPercent, setNewHerbPercent] = useState<string>("");

  // UI state
  const [isAssessing, setIsAssessing] = useState(false);
  const [riskResult, setRiskResult] = useState<TKRiskResponse | null>(null);

  // Load a sample formulation
  const handleLoadSample = (sample: (typeof SAMPLE_FORMULATIONS)[0]) => {
    setFormulationName(sample.name);
    setSystem(sample.system);
    setProposedClaims(sample.claims);
    setIngredients(sample.ingredients);
    setRiskResult(null);
  };

  // Add new herb to formulation
  const handleAddHerb = () => {
    if (!newHerbName.trim()) return;
    const herb: IngredientInput = {
      name: newHerbName.trim(),
      latin_name: newHerbLatin.trim() || undefined,
      percentage: newHerbPercent ? parseFloat(newHerbPercent) : undefined,
    };
    setIngredients((prev) => [...prev, herb]);
    setNewHerbName("");
    setNewHerbLatin("");
    setNewHerbPercent("");
  };

  // Remove herb from formulation
  const handleRemoveHerb = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  // Trigger POST /api/tk-risk/assess
  const handleAssess = async () => {
    if (!formulationName.trim() || ingredients.length === 0) {
      alert("Please provide a formulation name and at least one ingredient.");
      return;
    }

    setIsAssessing(true);
    try {
      const payload: TKRiskRequest = {
        formulation_name: formulationName,
        system: system,
        ingredients: ingredients,
        proposed_claims: proposedClaims,
      };

      const result = await assessTKRisk(payload);
      setRiskResult(result);
    } catch (err: any) {
      alert(`Assessment failed: ${err.message || err}`);
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Banner */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  Traditional Knowledge Assessor
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-semibold text-slate-500">Section 3(p) Patent Audit</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">TKDL &amp; Section 3(p) Prior-Art Risk Engine</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Check herbal and AYUSH formulations against the Traditional Knowledge Digital Library (TKDL) and classical texts (API, Charaka Samhita, Sushruta Samhita) to evaluate Section 3(p) patent rejection risk before filing.
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider w-full md:w-auto">Preset Examples:</span>
              {SAMPLE_FORMULATIONS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadSample(sample)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 transition-all"
                >
                  {sample.name.split(" ")[0]} {sample.name.split(" ")[1]}
                </button>
              ))}
            </div>
          </div>

          {/* ── Twin Split Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── LEFT PANEL: Formulation & Ingredients Builder (6 Cols) ── */}
            <div className="lg:col-span-6 space-y-6">
              {/* Formulation Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <FlaskConical size={18} className="text-emerald-700" />
                  <h3 className="text-base font-bold text-slate-900">Formulation &amp; Claim Details</h3>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Product / Formulation Name *</label>
                    <input
                      type="text"
                      value={formulationName}
                      onChange={(e) => setFormulationName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      placeholder="e.g. Ashwagandha & Guduchi Immunity Elixir"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Traditional System</label>
                      <select
                        value={system}
                        onChange={(e) => setSystem(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      >
                        {SYSTEMS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Proposed Intended Claims</label>
                      <input
                        type="text"
                        value={proposedClaims}
                        onChange={(e) => setProposedClaims(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                        placeholder="e.g. Immunomodulatory & anti-stress syrup"
                      />
                    </div>
                  </div>
                </div>

                {/* Ingredients Manager Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Formulation Ingredients ({ingredients.length})</h4>
                  </div>

                  {/* Add Herb Form */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-700">Add Botanical / Traditional Herb</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <input
                          type="text"
                          value={newHerbName}
                          onChange={(e) => setNewHerbName(e.target.value)}
                          placeholder="Herb name (e.g. Tulsi) *"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newHerbLatin}
                          onChange={(e) => setNewHerbLatin(e.target.value)}
                          placeholder="Latin name (e.g. Ocimum sanctum)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={newHerbPercent}
                          onChange={(e) => setNewHerbPercent(e.target.value)}
                          placeholder="% Composition"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddHerb}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs transition-colors flex-shrink-0"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Table */}
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-emerald-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{ing.name}</p>
                            {ing.latin_name && <p className="text-[11px] text-slate-500 italic">{ing.latin_name}</p>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {ing.percentage && (
                            <span className="px-2.5 py-1 bg-slate-100 font-mono text-slate-700 font-bold rounded-md text-[11px]">
                              {ing.percentage}%
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveHerb(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Process Evidence for IP Review Optional Card */}
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Cpu size={15} className="text-emerald-700" />
                        Use Process Evidence for IP Review
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        Smart IoT Linked
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Attach real-time ESP32-001 environmental process monitoring evidence (temperature: 28.4°C, humidity: 61%, controlled extraction parameters) as technical supporting context for IP prior-art review.
                    </p>
                  </div>

                  {/* Submit Assessment Button */}
                  <button
                    onClick={handleAssess}
                    disabled={isAssessing}
                    className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all mt-4"
                  >
                    {isAssessing ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                    <span>{isAssessing ? "Cross-referencing TKDL Records..." : "Assess TKDL & Section 3(p) Patent Risk"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Risk Assessment Result Card (6 Cols) ── */}
            <div className="lg:col-span-6 space-y-6">
              {riskResult ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                  {/* Result Header with Dynamic Risk Color */}
                  <div
                    className={`p-6 text-white relative ${
                      riskResult.risk_level === "HIGH_RISK"
                        ? "bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950"
                        : riskResult.risk_level === "MODERATE_RISK"
                        ? "bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950"
                        : "bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20">
                          <Scale size={12} />
                          Statutory Section 3(p) Audit
                        </span>
                        <h2 className="text-xl font-black text-white mt-2 leading-tight">{riskResult.formulation_name}</h2>
                        <p className="text-xs text-white/80 font-medium">{riskResult.system} System Formulation</p>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right flex flex-col items-end">
                        <div
                          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg ${
                            riskResult.risk_level === "HIGH_RISK"
                              ? "bg-rose-600 border-rose-400 text-white"
                              : riskResult.risk_level === "MODERATE_RISK"
                              ? "bg-amber-600 border-amber-400 text-white"
                              : "bg-emerald-600 border-emerald-400 text-white"
                          }`}
                        >
                          <span className="text-2xl font-black leading-none">{riskResult.overall_risk_score}</span>
                          <span className="text-[9px] font-bold opacity-80 uppercase tracking-tighter mt-0.5">Risk</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-white/80">Section 3(p) Risk Level:</span>
                      <span
                        className={`font-black uppercase tracking-wide px-2.5 py-0.5 rounded text-[11px] ${
                          riskResult.risk_level === "HIGH_RISK"
                            ? "bg-rose-500/30 text-rose-300 border border-rose-400/50"
                            : riskResult.risk_level === "MODERATE_RISK"
                            ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
                            : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                        }`}
                      >
                        {riskResult.section_3p_compliance_status}
                      </span>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-6 space-y-5">
                    {/* Assessment Summary Box */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <BookOpen size={15} className="text-emerald-700" />
                        Patentability Analysis
                      </p>
                      <p className="text-slate-600 leading-relaxed">{riskResult.patentability_assessment}</p>
                    </div>

                    {/* Matched TKDL References Table */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                        Matched TKDL &amp; Classical Text Prior Art ({riskResult.matched_entries.length})
                      </h4>
                      <div className="space-y-2.5">
                        {riskResult.matched_entries.length === 0 ? (
                          <div className="p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                            <span>No direct matches found in TKDL reference database for these specific ingredients!</span>
                          </div>
                        ) : (
                          riskResult.matched_entries.map((match, idx) => (
                            <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-xs hover:border-emerald-300 transition-colors shadow-2xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 text-sm">{match.traditional_name}</span>
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded font-bold text-[10px]">
                                  {match.risk_factor.replace("_", " ")}
                                </span>
                              </div>

                              <p className="text-slate-500 italic text-[11px]">Botanical: {match.latin_name}</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                                <div>
                                  <span className="text-slate-400 font-medium">Classical Source:</span>
                                  <p className="font-semibold text-slate-700">{match.classical_text_source}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-medium">TKDL Record:</span>
                                  <p className="font-mono text-emerald-700 font-bold">{match.tkdl_reference}</p>
                                </div>
                              </div>

                              <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600">
                                <strong className="text-slate-800">Documented Traditional Use:</strong> {match.known_therapeutic_use}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recommendations List */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">Recommended Novelty Strategy</h4>
                      <ul className="space-y-2 text-xs">
                        {riskResult.key_recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-slate-800">
                            <Sparkles size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ask AI Advisor Trigger */}
                    <button
                      onClick={() =>
                        router.push(
                          `/chat?prompt=${encodeURIComponent(
                            `My formulation '${riskResult.formulation_name}' has a Section 3(p) TKDL risk score of ${riskResult.overall_risk_score}/100. How can I draft patent claims focusing on non-obvious synergistic ratios to clear Section 3(p) objections under Indian patent law?`
                          )}`
                        )
                      }
                      className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                    >
                      <Sparkles size={15} className="text-emerald-400" />
                      <span>Ask AI Advisor to Draft Section 3(p) Patent Claims</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <BookOpen size={36} className="mx-auto text-emerald-600/40" />
                  <h3 className="text-base font-bold text-slate-800">Ready for TKDL Assessment</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Fill in your product formulation ingredients on the left and click <strong>Assess TKDL Risk</strong> to evaluate prior art and Section 3(p) patentability.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
