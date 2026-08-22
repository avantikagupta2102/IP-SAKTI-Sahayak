"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Building2,
  Award,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  ListOrdered,
  FileCheck,
} from "lucide-react";
import {
  BusinessProfile,
  ExpertBriefResponse,
  generateExpertBrief,
  getProfiles,
} from "@/lib/api";

export default function ExpertBriefPage() {
  const router = useRouter();

  // Profiles State
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  // Brief Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [brief, setBrief] = useState<ExpertBriefResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Load profiles on mount
  useEffect(() => {
    async function init() {
      try {
        const profs = await getProfiles();
        setProfiles(profs);
        if (profs.length > 0 && profs[0].id) {
          setSelectedProfileId(profs[0].id);
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    }
    init();
  }, []);

  // Trigger POST /api/expert-brief
  const handleGenerateBrief = async () => {
    if (!selectedProfileId) {
      alert("Please select a business profile first.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateExpertBrief({ profile_id: selectedProfileId });
      setBrief(res);
    } catch (err: any) {
      alert(`Brief generation failed: ${err.message || err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Brief as .md File
  const handleDownloadMd = () => {
    if (!brief) return;
    const filename = `IP_Compliance_Brief_${brief.company_name.replace(/\s+/g, "_")}.md`;
    const blob = new Blob([brief.brief_markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Brief to Clipboard
  const handleCopyClipboard = () => {
    if (!brief) return;
    navigator.clipboard.writeText(brief.brief_markdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
                  AI Compliance Synthesizer
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-semibold text-slate-500">Executive Document Generator</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive IP Compliance Brief</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Synthesize your business profile, IP asset portfolio, and compliance passport into an authoritative plain-language brief powered by the local LLM.
              </p>
            </div>

            {/* Profile Selector & Generate Action */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-[220px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
                  <Building2 size={12} className="text-emerald-700" />
                  <span>Target Business Profile</span>
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.company_name} ({p.sector})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateBrief}
                disabled={isGenerating || !selectedProfileId}
                className="px-5 py-3.5 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-all flex-shrink-0"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} className="text-emerald-400" />}
                <span>{isGenerating ? "Synthesizing Brief..." : "Generate Brief"}</span>
              </button>
            </div>
          </div>

          {/* Brief Content Viewer */}
          {isGenerating ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-4">
              <RefreshCw size={36} className="mx-auto text-emerald-600 animate-spin" />
              <h3 className="text-base font-bold text-slate-800">Synthesizing Executive Brief via Local LLM...</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Evaluating company profile, Section 3(p) prior art, and compliance passport audit logs to compose your executive report.
              </p>
            </div>
          ) : brief ? (
            <div className="space-y-6">
              {/* Document Header Card */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Official Executive Brief
                    </span>
                    <span className="text-xs text-white/50">• {brief.generated_at}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">{brief.company_name}</h2>
                  <p className="text-xs text-white/70 font-medium">
                    {brief.sector} Sector • {brief.company_type} Registration
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Score Badge */}
                  <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[100px]">
                    <span className="text-xs text-white/70 block uppercase tracking-wider font-bold">Compliance Score</span>
                    <span className="text-3xl font-black text-emerald-400">{brief.compliance_score}</span>
                    <span className="text-[10px] text-white/50 block font-medium uppercase mt-0.5">{brief.status_level}</span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleDownloadMd}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download size={14} />
                      <span>Download .MD</span>
                    </button>
                    <button
                      onClick={handleCopyClipboard}
                      className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{isCopied ? "Copied!" : "Copy Brief"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid: Brief Markdown Document & Side Takeaways */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Brief Document Body (8 Cols) */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck size={20} className="text-emerald-700" />
                      <h3 className="text-base font-bold text-slate-900">Executive Report Body</h3>
                    </div>
                  </div>

                  {/* Formatted Markdown View */}
                  <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-4 text-slate-800">
                    {brief.brief_markdown.split("\n\n").map((paragraph, idx) => {
                      if (paragraph.startsWith("# ")) {
                        return <h1 key={idx} className="text-lg font-black text-slate-900 pt-2 border-b border-slate-100 pb-2">{paragraph.replace("# ", "")}</h1>;
                      } else if (paragraph.startsWith("## ")) {
                        return <h2 key={idx} className="text-sm font-black text-emerald-900 pt-3">{paragraph.replace("## ", "")}</h2>;
                      } else if (paragraph.startsWith("### ")) {
                        return <h3 key={idx} className="text-xs font-bold text-slate-800 pt-2">{paragraph.replace("### ", "")}</h3>;
                      } else {
                        return <p key={idx} className="text-slate-700 leading-relaxed whitespace-pre-wrap">{paragraph}</p>;
                      }
                    })}
                  </div>
                </div>

                {/* Side Summary Cards (4 Cols) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Key Takeaways */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Award size={16} className="text-emerald-700" />
                      Executive Key Takeaways
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {brief.key_takeaways.map((takeaway, idx) => (
                        <li key={idx} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 leading-relaxed">
                          • {takeaway}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next Milestones */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ListOrdered size={16} className="text-emerald-700" />
                      Next Action Milestones
                    </h4>
                    <ol className="space-y-2 text-xs text-slate-700">
                      {brief.next_milestones.map((m, idx) => (
                        <li key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium">
                          <strong className="text-emerald-800 mr-1.5">{idx + 1}.</strong> {m}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Ask AI Advisor Trigger */}
                  <button
                    onClick={() =>
                      router.push(
                        `/chat?prompt=${encodeURIComponent(
                          `Review the executive brief generated for ${brief.company_name} (Compliance Score ${brief.compliance_score}/100) and guide me on implementing the recommended statutory milestones.`
                        )}`
                      )
                    }
                    className="w-full py-3.5 bg-slate-900 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <Sparkles size={15} className="text-emerald-400" />
                    <span>Follow Up with AI Advisor</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
              <FileText size={40} className="mx-auto text-emerald-600/40" />
              <h3 className="text-base font-bold text-slate-800">Ready to Synthesize Brief</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select your company profile above and click <strong>Generate Brief</strong> to run an automated statutory evaluation and generate a downloadable Markdown report.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
