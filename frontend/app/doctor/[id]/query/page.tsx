"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Brain, Search, RefreshCw, Sparkles, X,
  FileText, Calendar, Link2, ArrowRight, CornerDownRight, Network
} from "lucide-react";

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  demographics?: string;
}

interface GraphLink {
  source: string;
  relation: string;
  target: string;
}

interface QueryResponse {
  question: string;
  answer: string;
  role: string;
  supporting_timeline: string[];
  related_reports: string[];
  graph_links: GraphLink[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ───── Simple Markdown Parser ───── */
function MarkdownRenderer({ text, patientId }: { text: string; patientId: number }) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];

  const parseCitations = (rawText: string) => {
    // Split by bracket citations like [concept]
    const parts = rawText.split(/\[([^\]]+)\]/g);
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        const nodeName = part;
        return (
          <Link
            key={`cit-${idx}`}
            href={`/doctor/${patientId}/graph?highlight=${encodeURIComponent(nodeName)}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/35 hover:border-indigo-400 text-[10px] font-black text-indigo-300 transition-all select-none hover:shadow-[0_0_8px_rgba(99,102,241,0.4)]"
            title={`Find [${nodeName}] in Relationship Explorer`}
          >
            <Network className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            {nodeName}
          </Link>
        );
      }
      return part;
    });
  };

  const parseInline = (line: string) => {
    // Parse bold text: **text**
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return parts.flatMap((part, i) => (
      i % 2 === 1 ? (
        [<strong key={`b-${i}`} className="text-white font-extrabold">{parseCitations(part)}</strong>]
      ) : (
        parseCitations(part)
      )
    ));
  };

  const flushList = (key: number) => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-2 my-3 text-slate-350">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-[12.5px] leading-relaxed font-medium">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(idx);
      blocks.push(<div key={`spacer-${idx}`} className="h-2" />);
      return;
    }

    if (line.startsWith("#")) {
      flushList(idx);
      const headingText = line.replace(/^#+\s*/, "");
      blocks.push(
        <h4 key={`h-${idx}`} className="text-indigo-400 font-bold mt-4 mb-2 text-xs tracking-wider uppercase">
          {parseInline(headingText)}
        </h4>
      );
    } else if (line.startsWith("* ") || line.startsWith("- ")) {
      currentList.push(line.slice(2));
    } else {
      flushList(idx);
      blocks.push(
        <p key={`p-${idx}`} className="text-[12.5px] text-slate-300 leading-relaxed font-medium mb-3">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList(lines.length);
  return <div className="text-slate-300">{blocks}</div>;
}

export default function DoctorQueryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [queryInput, setQueryInput] = useState<string>("");
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [stats, setStats] = useState({ conditions: 0, medications: 0, reports: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const [pRes, dRes, gRes] = await Promise.all([
          fetch(`${API_BASE}/patients/${patientId}`),
          fetch(`${API_BASE}/patients/${patientId}/documents`),
          fetch(`${API_BASE}/patients/${patientId}/graph`)
        ]);
        if (pRes.ok) setPatient(await pRes.json());
        if (dRes.ok) {
          const docs = await dRes.json();
          setStats(prev => ({ ...prev, reports: docs.length }));
        }
        if (gRes.ok) {
          const graph = await gRes.json();
          const conds = graph.nodes.filter((n: any) => n.type === "disease").length;
          const meds = graph.nodes.filter((n: any) => n.type === "medication").length;
          setStats(prev => ({ ...prev, conditions: conds, medications: meds }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [patientId]);

  const handleAskQuery = async (questionText?: string) => {
    const finalQuestion = questionText || queryInput;
    if (!finalQuestion.trim()) return;

    setIsQuerying(true);
    setQueryResponse(null);
    if (!questionText) setQueryInput("");

    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: finalQuestion,
          role: "doctor"
        })
      });

      if (res.ok) {
        const data: QueryResponse = await res.json();
        setQueryResponse(data);
      } else {
        setQueryResponse({
          question: finalQuestion,
          answer: "Failed to recall memory from Cognee graph.",
          role: "doctor",
          supporting_timeline: [],
          related_reports: [],
          graph_links: []
        });
      }
    } catch (err) {
      setQueryResponse({
        question: finalQuestion,
        answer: "Error communicating with Cognee query engine.",
        role: "doctor",
        supporting_timeline: [],
        related_reports: [],
        graph_links: []
      });
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  const getQueryPresets = () => {
    return [
      "When was diabetes diagnosed and what was the initial treatment plan?",
      "Compare HbA1c history.",
      "What surgery did John undergo and what were the post-op meds?",
      "Is John allergic to any medications?",
      "List all active medications currently prescribed.",
      "Are there any signs of peripheral neuropathy?"
    ];
  };

  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── patient stats bar ── */}
      {patient && (
        <div className="border-b border-slate-800/60 bg-[#0a1025]/80 backdrop-blur-md">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-indigo-500/20">
                {initials(patient.name)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">{patient.name}</h2>
                <p className="text-[11px] text-slate-400">{patient.gender}, {patient.age} years</p>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800 mx-1" />
            {[
              { n: stats.conditions,  label: "Conditions",  color: "#22d3ee" },
              { n: stats.medications, label: "Medications", color: "#facc15" },
              { n: stats.reports,     label: "Reports",     color: "#f97316" }
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className="text-base font-black" style={{ color: s.color }}>{s.n}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── main 3-column layout ── */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* ── LEFT PANEL: presets suggestions ── */}
        <aside className="w-[260px] min-w-[260px] border-r border-slate-800/50 bg-[#080e20]/60 overflow-y-auto px-4 py-5 flex flex-col gap-4 scrollbar-thin">
          <div className="rounded-2xl border border-slate-800/50 bg-[#0a1025]/60 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/30">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                Clinical Presets
              </h4>
            </div>
            <div className="px-2 py-2 flex flex-col gap-1">
              {getQueryPresets().map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQueryInput(preset);
                    handleAskQuery(preset);
                  }}
                  className="w-full text-left text-[11px] p-2.5 bg-transparent hover:bg-indigo-500/5 hover:text-indigo-300 border border-transparent hover:border-indigo-500/20 rounded-xl transition-all font-semibold text-slate-400 leading-normal"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col gap-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Cognee Semantic Query</span>
            <p className="text-[10.5px] text-slate-400 leading-normal">
              Resolves semantic relationships and consolidates multiple source files automatically on recall.
            </p>
          </div>
        </aside>

        {/* ── CENTER PANEL: Ask Box & answer ── */}
        <div className="flex-1 flex flex-col bg-[#060b18] overflow-y-auto px-6 py-5">
          {/* Ask box */}
          <div className="relative w-full max-w-2xl mx-auto mb-5">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskQuery()}
              placeholder={`Ask anything about ${patient?.name || "the patient"}'s medical memory...`}
              className="w-full bg-[#0a1025]/60 border border-slate-800 rounded-2xl pl-12 pr-14 py-4 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-white placeholder-slate-550 font-medium"
            />
            <Brain className="w-4 h-4 text-indigo-400/60 absolute left-4 top-[18px]" />
            <button
              onClick={() => handleAskQuery()}
              disabled={isQuerying}
              className="absolute right-2 top-2 p-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl transition-all disabled:opacity-50"
            >
              {isQuerying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Loader or Output */}
          {isQuerying ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400 italic">Synthesizing clinical memory graph...</p>
            </div>
          ) : queryResponse ? (
            <div className="w-full max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in duration-300">
              {/* Answer Card */}
              <div className="rounded-3xl border border-slate-800 bg-[#0a1025]/50 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
                <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Memory Synthesis</h3>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                    Gemini 2.5
                  </span>
                </div>
                <div className="p-6">
                  <MarkdownRenderer text={queryResponse.answer} patientId={patientId} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Brain className="w-10 h-10 opacity-20" />
              <p className="text-xs font-medium">Select a preset suggestion or type a query above.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Evidence Inspector ── */}
        <aside className={`border-l border-slate-800/50 bg-[#080e20]/60 overflow-y-auto transition-all duration-300 flex flex-col ${queryResponse ? "w-[290px] min-w-[290px]" : "w-0 min-w-0"}`}>
          {queryResponse && (
            <div className="p-5 flex flex-col gap-5 animate-in slide-in-from-right-4 duration-200 scrollbar-thin">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-indigo-400" />
                  Clinical Evidence
                </h3>
              </div>

              {/* Supporting Timeline */}
              {queryResponse.supporting_timeline.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supporting Timeline</span>
                  <div className="flex flex-col gap-2 pl-2 border-l border-slate-800">
                    {queryResponse.supporting_timeline.map((event, idx) => (
                      <div key={idx} className="relative flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition">
                        <div className="absolute -left-[14px] top-4.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[11px] text-slate-300 font-medium leading-relaxed">{event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Reports */}
              {queryResponse.related_reports.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Related Reports</span>
                  <div className="flex flex-col gap-1.5">
                    {queryResponse.related_reports.map((report, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/40 border border-slate-850">
                        <FileText className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="text-[11px] text-slate-300 truncate font-semibold">{report}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Graph Links */}
              {queryResponse.graph_links.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Graph Links</span>
                  <div className="flex flex-col gap-2">
                    {queryResponse.graph_links.map((link, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-850 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[11px] text-slate-200 font-bold">{link.source}</span>
                          <span className="text-[9px] text-indigo-400 font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 shrink-0">
                            {link.relation.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <CornerDownRight className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-[10.5px] truncate font-medium">{link.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </main>
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}
