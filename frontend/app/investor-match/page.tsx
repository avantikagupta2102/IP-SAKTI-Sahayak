"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  BusinessProfile,
  getProfiles,
  GovtSchemeMatchItem,
  InvestorMatchResponse,
  InvestorProfileItem,
  NDAResponse,
  generateDigitalNDA,
  searchInvestorMatches,
} from "@/lib/api";
import {
  Award,
  Building,
  CheckCircle2,
  DollarSign,
  FileCheck,
  FileText,
  Filter,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";

export default function InvestorMatchPage() {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [fundingAmount, setFundingAmount] = useState<number>(25);
  const [stageFilter, setStageFilter] = useState<string>("Seed");
  const [sectorFilter, setSectorFilter] = useState<string>("AYUSH");
  const [ipAbstract, setIpAbstract] = useState<string>(
    "Synergistic Ayurvedic formulation incorporating Ashwagandha and Guduchi standardized extracts for immunomodulation with published clinical trials."
  );

  const [matchResults, setMatchResults] = useState<InvestorMatchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeNdaModal, setActiveNdaModal] = useState<InvestorProfileItem | null>(null);
  const [ndaResult, setNdaResult] = useState<NDAResponse | null>(null);
  const [isExecutingNda, setIsExecutingNda] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getProfiles();
        setProfiles(res);
        if (res.length > 0) {
          if (res[0].id) {
            setSelectedProfileId(res[0].id);
          }
          if (res[0].sector) {
            setSectorFilter(res[0].sector);
          }
        }
      } catch (e) {
        console.error("Failed to load profiles", e);
      }
    }
    loadData();
  }, []);

  const handleSearchMatches = async () => {
    setIsLoading(true);
    setNdaResult(null);
    try {
      const res = await searchInvestorMatches({
        profile_id: selectedProfileId || undefined,
        ip_abstract: ipAbstract,
        sector: sectorFilter,
        stage: stageFilter,
        funding_required_lakhs: fundingAmount,
      });
      setMatchResults(res);
    } catch (e) {
      console.error("Failed to search matches", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteNda = async () => {
    if (!activeNdaModal) return;
    setIsExecutingNda(true);
    try {
      const selectedProf = profiles.find((p) => p.id === selectedProfileId);
      const res = await generateDigitalNDA({
        investor_id: activeNdaModal.id,
        profile_id: selectedProfileId || "prof-default",
        ip_title: selectedProf?.company_name ? `${selectedProf.company_name} IP Assets` : "Proprietary IP Formulation",
      });
      setNdaResult(res);
    } catch (e) {
      console.error("NDA Execution failed", e);
    } finally {
      setIsExecutingNda(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} /> Algorithmic Matchmaker &amp; Deal Room
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Investor, Incubator &amp; Scheme Matchmaker
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect verified IP holders with VCs, Angel Syndicates, TTOs, and Government MSME seed schemes via vector-similarity scoring and encrypted NDA deal rooms.
            </p>
          </div>

          <button
            onClick={handleSearchMatches}
            disabled={isLoading}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-emerald-900/30 transition-all flex items-center gap-2 text-sm flex-shrink-0"
          >
            <Search size={18} />
            <span>{isLoading ? "Matching IP Assets..." : "Run Vector Matching"}</span>
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select IP Business Profile
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company_name} ({p.sector})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Sector
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="AYUSH">AYUSH (Ayurveda/Siddha/Unani)</option>
              <option value="BioTech">BioTech &amp; Life Sciences</option>
              <option value="Pharma">Pharmaceuticals &amp; MedTech</option>
              <option value="DeepTech">DeepTech &amp; AI</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Development Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Idea">Idea / Pre-Filing</option>
              <option value="Provisional">Provisional Patent Filed</option>
              <option value="TRL-4">TRL-4 (Lab Proof of Concept)</option>
              <option value="Granted">Granted Patent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Funding Required (₹ Lakhs)
            </label>
            <input
              type="number"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-4 mt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Invention Abstract / Technical Thesis (for Semantic Cosine Similarity)
            </label>
            <textarea
              rows={2}
              value={ipAbstract}
              onChange={(e) => setIpAbstract(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Results Section */}
        {matchResults && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Verification Trust Score Header */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={28} className="text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Cryptographic IP Trust Score: {matchResults.trust_score}/100
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Linked to WIPO / Indian Patent Gazette schemas • UDYAM Verified
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-full text-xs uppercase tracking-wider">
                {matchResults.ip_verification_status}
              </span>
            </div>

            {/* Matched VCs & Angel Syndicates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building size={20} className="text-indigo-600" />
                  <span>Matched Investors &amp; VCs ({matchResults.matched_investors.length})</span>
                </h2>
                <span className="text-xs text-slate-500 font-semibold">Ranked by Vector Cosine Similarity</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchResults.matched_investors.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px] uppercase tracking-wider border border-indigo-200">
                            {inv.type}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-1">{inv.name}</h3>
                          <p className="text-xs text-slate-500">{inv.entity_name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-indigo-600">{inv.match_score}%</span>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Match</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {inv.thesis_summary}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {inv.preferred_sectors.map((sec, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                            {sec}
                          </span>
                        ))}
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                          Ticket: ₹{inv.ticket_size_min_lakhs}L–₹{inv.ticket_size_max_lakhs}L
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveNdaModal(inv)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Lock size={14} className="text-amber-400" />
                      <span>Execute Digital NDA &amp; Request Deal Room</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Government MSME / Startup Schemes */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award size={20} className="text-emerald-600" />
                <span>Government Grant &amp; Seed Schemes ({matchResults.matched_schemes.length})</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchResults.matched_schemes.map((sch) => (
                  <div
                    key={sch.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-emerald-300 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-md text-[10px] uppercase tracking-wider border border-emerald-200">
                          {sch.ministry}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{sch.scheme_name}</h3>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-md">
                        Max ₹{sch.max_funding_lakhs}L
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>Type:</strong> {sch.funding_type}
                      </p>
                      <p>
                        <strong>Criteria:</strong> {sch.matching_criteria.join(" • ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NDA Modal */}
        {activeNdaModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="text-amber-500" size={20} />
                  <h3 className="text-base font-bold text-slate-900">Execute Digital NDA with {activeNdaModal.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveNdaModal(null);
                    setNdaResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {!ndaResult ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Executing this Non-Disclosure Agreement (NDA) grants <strong>{activeNdaModal.name}</strong> short-lived, encrypted access token to your technical master files in the IP Shakti Sahayak Deal Room.
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-700 space-y-2 font-mono max-h-48 overflow-y-auto">
                    <p className="font-bold text-slate-900">CONFIDENTIALITY &amp; PROPRIETARY INFORMATION AGREEMENT</p>
                    <p>
                      1. Parties agree to hold all patent specifications and formulation ratios in strict confidence under Section 10A of the IT Act 2000.
                    </p>
                    <p>2. Cryptographic audit SHA-256 fingerprint will be generated upon execution.</p>
                  </div>

                  <button
                    onClick={handleExecuteNda}
                    disabled={isExecutingNda}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <FileCheck size={16} />
                    <span>{isExecutingNda ? "Digitally Signing Agreement..." : "Digitally Sign & Access Deal Room"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 size={16} className="text-emerald-600" /> Digital NDA Successfully Executed!
                    </p>
                    <p>
                      <strong>NDA ID:</strong> {ndaResult.nda_id}
                    </p>
                    <p>
                      <strong>Signed At:</strong> {ndaResult.signed_at}
                    </p>
                    <p className="font-mono text-[10px] break-all text-emerald-800 mt-1">
                      <strong>Token:</strong> {ndaResult.dealroom_access_token}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {ndaResult.nda_document_text}
                  </div>

                  <button
                    onClick={() => {
                      setActiveNdaModal(null);
                      setNdaResult(null);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Done (Return to Matchmaker)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
