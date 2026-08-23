"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import {
  FilingDraftResponse,
  InventionProfile,
  PriorArtResult,
  ReadinessResponse,
  generateFilingDraft,
  searchPriorArt,
  scoreReadiness,
  sendFilingMessage,
  startFiling,
} from "@/lib/api";

const emptyProfile: InventionProfile = {
  title: "", technical_field: "", problem_statement: "", existing_approach: "", proposed_solution: "",
  novel_features: [], components: [], working_principle: "", process_steps: [], advantages: [], applications: [], differentiators: [],
};

const stages = ["Describe", "Clarify", "Draft", "Prior art", "Readiness"];

export default function FilingAssistantPage() {
  const [stage, setStage] = useState(() => {
    if (typeof window === "undefined") return 0;
    try { return JSON.parse(window.localStorage.getItem("ip-sakti-filing-workflow") || "{}").stage || 0; } catch { return 0; }
  });
  const [description, setDescription] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return JSON.parse(window.localStorage.getItem("ip-sakti-filing-workflow") || "{}").description || ""; } catch { return ""; }
  });
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return JSON.parse(window.localStorage.getItem("ip-sakti-filing-workflow") || "{}").sessionId || ""; } catch { return ""; }
  });
  const [profile, setProfile] = useState<InventionProfile>(() => {
    if (typeof window === "undefined") return emptyProfile;
    try { return JSON.parse(window.localStorage.getItem("ip-sakti-filing-workflow") || "{}").profile || emptyProfile; } catch { return emptyProfile; }
  });
  const [question, setQuestion] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return JSON.parse(window.localStorage.getItem("ip-sakti-filing-workflow") || "{}").question || ""; } catch { return ""; }
  });
  const [draft, setDraft] = useState<FilingDraftResponse | null>(null);
  const [results, setResults] = useState<PriorArtResult[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    window.localStorage.setItem("ip-sakti-filing-workflow", JSON.stringify({ sessionId, profile, question, stage, description }));
  }, [sessionId, profile, question, stage, description]);

  const run = async (action: () => Promise<void>) => {
    setLoading(true); setError("");
    try { await action(); } catch (err) {
      const message = err instanceof Error ? err.message : "The request could not be completed.";
      setError(message.includes("Ollama") || message.includes("Local AI") ? "Local AI service is unavailable. Please ensure Ollama is running." : message);
    } finally { setLoading(false); }
  };

  const begin = () => run(async () => {
    const response = await startFiling(description);
    setSessionId(response.session_id); setProfile(response.profile); setQuestion(response.question || ""); setStage(1);
    if (!response.ai_available) setError("Local AI service is unavailable. Please ensure Ollama is running. Your text is retained; complete the profile manually or retry.");
  });

  const clarify = () => run(async () => {
    const response = await sendFilingMessage(sessionId, answer);
    setProfile(response.profile); setQuestion(response.question || ""); setAnswer("");
    if (!response.question) setStage(2);
  });

  const createDraft = () => run(async () => { setDraft(await generateFilingDraft(sessionId)); setStage(3); });
  const runSearch = () => run(async () => { const response = await searchPriorArt(profile); setResults(response.results); setStage(4); });
  const runScore = () => run(async () => { setReadiness(await scoreReadiness(profile, draft || undefined, results)); });

  const fieldValue = (value: string | string[]) => Array.isArray(value) ? value.join(", ") : value;

  return <AppShell>
    <main className="h-full overflow-y-auto bg-[#f5f7f3] px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">IP preparation workspace</p><h1 className="text-3xl font-bold tracking-tight text-slate-950">Filing assistant</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Turn an invention description into a structured preliminary profile, a searchable representation, and an explainable readiness view.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-emerald-700" /> Local-first and evidence-aware</div>
        </div>

        <div className="mb-6 grid grid-cols-5 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {stages.map((label, index) => <div key={label} className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold ${index <= stage ? "bg-emerald-800 text-white" : "text-slate-400"}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">{index < stage ? "✓" : index + 1}</span><span className="hidden sm:inline">{label}</span></div>)}
        </div>

        {error && <div role="alert" className="mb-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>}

        {stage === 0 && <section className="grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><div className="rounded-md bg-emerald-100 p-2 text-emerald-800"><Sparkles size={20} /></div><div><h2 className="font-bold text-slate-950">Start with the invention</h2><p className="text-xs text-slate-500">Describe it naturally. The assistant will identify what is known and ask only for gaps.</p></div></div><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Example: I developed a low-cost solar-powered irrigation controller that uses soil moisture readings to control a pump..." className="min-h-48 w-full resize-y rounded-md border border-slate-300 p-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /><button disabled={!description.trim() || loading} onClick={begin} className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />} Build invention profile</button></div>
          <div className="rounded-lg border border-slate-200 bg-[#e9f1e8] p-6"><h3 className="font-bold text-slate-950">What you will get</h3><ul className="mt-4 space-y-4 text-sm text-slate-700">{["Adaptive questions for high-value missing detail", "A reviewable preliminary IP draft", "Similarity results from the indexed local corpus", "A deterministic 0–100 readiness score"].map(item => <li className="flex gap-2" key={item}><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />{item}</li>)}</ul></div>
        </section>}

        {stage === 1 && <section className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Adaptive clarification</p><h2 className="mt-2 text-xl font-bold text-slate-950">{question || "Your profile is ready for review."}</h2><p className="mt-3 text-sm text-slate-600">Skip with a short answer if a detail is not known yet. You can refine the profile with a qualified IP professional later.</p><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Add the detail here..." className="mt-5 min-h-32 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-emerald-600" /><div className="mt-3 flex gap-2"><button disabled={!answer.trim() || loading} onClick={clarify} className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={15} /> : <ArrowRight size={15} />} Save detail</button><button onClick={() => setStage(2)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Continue with profile</button></div></div>
          <ProfilePanel profile={profile} fieldValue={fieldValue} />
        </section>}

        {stage === 2 && <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Step 3 of 5</p><h2 className="mt-1 text-xl font-bold text-slate-950">Preliminary IP draft</h2><p className="mt-1 text-sm text-slate-600">Generate a reviewable draft from the profile you collected.</p></div><FileText className="text-emerald-700" /></div><ProfilePanel profile={profile} fieldValue={fieldValue} /><button disabled={loading} onClick={createDraft} className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />} Generate preliminary draft</button></section>}

        {stage === 3 && draft && <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">{draft.title}</h2><p className="mt-2 text-xs font-semibold text-amber-800">{draft.disclaimer}</p><DraftBlock title="Abstract" text={draft.abstract} /><DraftBlock title="Technical field" text={draft.technical_field} /><DraftBlock title="Background" text={draft.background} /><DraftBlock title="Summary" text={draft.summary} /><DraftBlock title="Detailed description" text={draft.detailed_description} /><button disabled={loading} onClick={runSearch} className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Search indexed prior art</button></section>}

        {stage === 4 && <section><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Step 4 of 5</p><h2 className="mt-1 text-xl font-bold text-slate-950">Similarity results</h2><p className="mt-1 text-sm text-slate-600">{results.length} indexed document{results.length === 1 ? "" : "s"} returned. Similarity is not a legal conclusion.</p></div><Search className="text-emerald-700" /></div>{results.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No relevant documents were found in the current indexed corpus.</div> : <div className="space-y-3">{results.map(result => <div key={result.document_id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><h3 className="font-bold text-slate-950">{result.title}</h3><p className="text-xs text-slate-500">{result.source} · {result.corpus_label}</p></div><strong className="text-lg text-emerald-800">{result.similarity_score}%</strong></div><p className="mt-3 text-sm text-slate-700">{result.explanation}</p>{result.overlapping_features.length > 0 && <p className="mt-2 text-xs text-amber-800"><b>Potential overlap:</b> {result.overlapping_features.join("; ")}</p>}{result.distinguishing_features.length > 0 && <p className="mt-2 text-xs text-emerald-800"><b>Potential distinction:</b> {result.distinguishing_features.join("; ")}</p>}</div>)}</div>}<button disabled={loading} onClick={runScore} className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} Calculate readiness</button></section>}

        {readiness && <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center"><div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-emerald-700"><strong className="text-3xl text-slate-950">{readiness.score}</strong><span className="text-[10px] font-bold uppercase text-slate-500">of 100</span></div><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Final IP preparation dashboard</p><h2 className="mt-1 text-2xl font-bold text-slate-950">IP readiness</h2><p className="mt-2 text-sm text-slate-600">A completeness and preparation assessment, not a patentability determination.</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-2">{readiness.dimensions.map(d => <div key={d.name} className="rounded-md border border-slate-200 p-3"><div className="flex justify-between text-sm font-semibold"><span>{d.name}</span><span className="text-emerald-800">{d.score}</span></div><div className="mt-2 h-1.5 bg-slate-100"><div className="h-1.5 bg-emerald-700" style={{ width: `${d.score}%` }} /></div><p className="mt-2 text-xs text-slate-500">{d.rationale}</p></div>)}</div><div className="mt-6 grid gap-6 md:grid-cols-2"><div><h3 className="font-bold text-slate-950">Strengths</h3><p className="mt-2 text-sm text-slate-600">{readiness.strengths.join(" · ") || "Continue adding profile detail."}</p></div><div><h3 className="font-bold text-slate-950">Recommended next steps</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{readiness.recommended_next_steps.map(step => <li key={step}>{step}</li>)}</ul></div></div><p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">{readiness.disclaimer} Generated drafts and claim concepts require review by a qualified IP professional.</p></section>}
      </div>
    </main>
  </AppShell>;
}

function ProfilePanel({ profile, fieldValue }: { profile: InventionProfile; fieldValue: (value: string | string[]) => string }) {
  const fields: [string, keyof InventionProfile][] = [["Title", "title"], ["Technical field", "technical_field"], ["Problem", "problem_statement"], ["Proposed solution", "proposed_solution"], ["Novel features", "novel_features"], ["Components", "components"], ["Working principle", "working_principle"], ["Differentiators", "differentiators"]];
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-5"><h3 className="font-bold text-slate-950">Structured invention profile</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(([label, key]) => <div key={key}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-800">{fieldValue(profile[key]) || "Not captured yet"}</p></div>)}</div></div>;
}

function DraftBlock({ title, text }: { title: string; text: string }) { return <div className="mt-5"><h3 className="text-sm font-bold text-slate-950">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text || "Not captured."}</p></div>; }
