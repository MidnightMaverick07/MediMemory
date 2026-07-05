"use client";

import React, { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { 
  Sparkles, 
  RefreshCw, 
  GitCompare, 
  HelpCircle, 
  ArrowRight, 
  Database,
  Network,
  Pill,
  Heart,
  Stethoscope,
  FileText,
  Clock,
  PlusCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  User,
  BriefcaseMedical
} from "lucide-react";

interface Node {
  id: string;
  label: string;
  type: string;
  description: string;
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

interface TimelineAddition {
  date: string;
  event: string;
  event_type: string;
}

interface EvolutionData {
  patient_id: number;
  latest_doc_name: string | null;
  before_graph: { nodes: Node[]; edges: Edge[] };
  after_graph: { nodes: Node[]; edges: Edge[] };
  new_nodes: Node[];
  new_edges: Edge[];
  merged_nodes: Node[];
  timeline_additions: TimelineAddition[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function MemoryEvolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [data, setData] = useState<EvolutionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"new_nodes" | "merged_nodes" | "new_edges" | "timeline_additions">("new_nodes");

  useEffect(() => {
    fetchEvolutionData();
  }, [patientId]);

  const fetchEvolutionData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/evolution`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error("Error fetching memory evolution data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEvolutionData();
    } finally {
      setRefreshing(false);
    }
  };

  const renderCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "disease":
        return <Heart className="w-3.5 h-3.5 text-cyan-400" />;
      case "medication":
        return <Pill className="w-3.5 h-3.5 text-amber-400" />;
      case "report":
        return <FileText className="w-3.5 h-3.5 text-orange-400" />;
      case "surgery":
        return <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />;
      case "patient":
        return <User className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Database className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const renderEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "diagnosis":
        return <Heart className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />;
      case "surgery":
        return <BriefcaseMedical className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
      case "medication_change":
        return <Pill className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
      case "lab_report":
        return <FileText className="w-3.5 h-3.5 text-sky-400 animate-pulse" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />;
    }
  };

  // Group nodes by category for clean split metrics
  const beforeStats = useMemo(() => {
    if (!data) return { nodes: 0, edges: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    data.before_graph.nodes.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    return {
      nodes: data.before_graph.nodes.length,
      edges: data.before_graph.edges.length,
      byType
    };
  }, [data]);

  const afterStats = useMemo(() => {
    if (!data) return { nodes: 0, edges: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    data.after_graph.nodes.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    return {
      nodes: data.after_graph.nodes.length,
      edges: data.after_graph.edges.length,
      byType
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Reconstructing historical memory snapshots...</p>
        </div>
      </div>
    );
  }

  const newNodesCount = data?.new_nodes.length || 0;
  const mergedNodesCount = data?.merged_nodes.length || 0;
  const newEdgesCount = data?.new_edges.length || 0;
  const timelineCount = data?.timeline_additions.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header currentPatientId={patientId} activePortal="patient" activeTab="evolution" />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* Title */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-indigo-400 animate-pulse" />
              Memory Evolution
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed max-w-xl">
              Compare Cognee semantic graph memories before and after record ingestion. Visually track how ontology improvements merge duplicates, build new medical relationships, and evolve the longitudinal clinical memory.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Run Compare Diff
          </button>
        </div>

        {data?.latest_doc_name ? (
          <>
            {/* Evolution Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/35 border border-slate-850 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl pointer-events-none rounded-full" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">New Concepts</span>
                <span className="text-2xl font-black text-emerald-400 block mt-2 flex items-center gap-1">
                  +{newNodesCount}
                  <span className="text-xs text-slate-400 font-normal">nodes</span>
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">E.g., new diagnoses, lab values</span>
              </div>

              <div className="bg-slate-900/35 border border-slate-850 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl pointer-events-none rounded-full" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Consolidated Concepts</span>
                <span className="text-2xl font-black text-indigo-400 block mt-2 flex items-center gap-1">
                  {mergedNodesCount}
                  <span className="text-xs text-slate-400 font-normal">merged</span>
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">Enriched existing memory concepts</span>
              </div>

              <div className="bg-slate-900/35 border border-slate-850 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 blur-xl pointer-events-none rounded-full" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">New Connections</span>
                <span className="text-2xl font-black text-violet-400 block mt-2 flex items-center gap-1">
                  +{newEdgesCount}
                  <span className="text-xs text-slate-400 font-normal">links</span>
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">Direct semantic connections built</span>
              </div>

              <div className="bg-slate-900/35 border border-slate-850 rounded-2xl p-4 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 blur-xl pointer-events-none rounded-full" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Timeline Updates</span>
                <span className="text-2xl font-black text-sky-400 block mt-2 flex items-center gap-1">
                  +{timelineCount}
                  <span className="text-xs text-slate-400 font-normal">events</span>
                </span>
                <span className="text-[9px] text-slate-500 font-medium block mt-1">Added to patient medical timeline</span>
              </div>
            </div>

            {/* Split View Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* SNAPSHOT BEFORE */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-800/10 blur-3xl pointer-events-none rounded-full" />
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Before Last Upload</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[9px] font-bold border border-slate-700/60 uppercase">
                      Snapshot T-1
                    </span>
                  </div>
                  <div className="h-[1px] bg-slate-800/60 w-full" />
                  
                  <div className="flex items-center justify-around py-4">
                    <div className="text-center">
                      <span className="text-3xl font-black text-slate-400">{beforeStats.nodes}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Total Nodes</span>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-center">
                      <span className="text-3xl font-black text-slate-400">{beforeStats.edges}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Total Edges</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nodes by Category:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(beforeStats.byType).map(([type, count], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850 rounded-xl">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            {renderCategoryIcon(type)}
                            {type.charAt(0).toUpperCase() + type.slice(1)}s
                          </span>
                          <span className="font-bold text-slate-200">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-850/60 text-slate-500 text-[10px] leading-relaxed">
                  Showing structured memory graph before processing <code className="bg-slate-950 px-1 py-0.5 border border-slate-850 rounded text-slate-350">{data.latest_doc_name}</code>.
                </div>
              </div>

              {/* SNAPSHOT AFTER */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[340px] shadow-indigo-500/5 shadow-md">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">After Ingestion (Refined)</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-md text-[9px] font-bold border border-indigo-500/20 uppercase animate-pulse">
                      Snapshot Current
                    </span>
                  </div>
                  <div className="h-[1px] bg-slate-800/60 w-full" />
                  
                  <div className="flex items-center justify-around py-4">
                    <div className="text-center">
                      <span className="text-3xl font-black text-white flex items-center justify-center gap-1">
                        {afterStats.nodes}
                        <span className="text-xs text-emerald-400 font-bold">+{newNodesCount}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Total Nodes</span>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-center">
                      <span className="text-3xl font-black text-white flex items-center justify-center gap-1">
                        {afterStats.edges}
                        <span className="text-xs text-violet-400 font-bold">+{newEdgesCount}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mt-1">Total Edges</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nodes by Category:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(afterStats.byType).map(([type, count], idx) => {
                        const prevCount = beforeStats.byType[type] || 0;
                        const diff = count - prevCount;
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850 rounded-xl">
                            <span className="flex items-center gap-1.5 text-slate-350">
                              {renderCategoryIcon(type)}
                              {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </span>
                            <span className="font-bold text-slate-100 flex items-center gap-1">
                              {count}
                              {diff > 0 && <span className="text-[9px] text-emerald-400 font-bold">(+{diff})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-850/60 text-slate-400 text-[10px] leading-relaxed flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Successfully improved ontology and merged concept layers using `cognee.improve()`.
                </div>
              </div>

            </div>

            {/* Delta Details Section */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 flex flex-col gap-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evolved Delta Details</h3>
                
                {/* Tab selector */}
                <div className="flex flex-wrap gap-1 bg-slate-950 border border-slate-850 p-1 rounded-xl">
                  {[
                    { id: "new_nodes", label: `New Concepts (${newNodesCount})` },
                    { id: "merged_nodes", label: `Consolidated (${mergedNodesCount})` },
                    { id: "new_edges", label: `New Connections (${newEdgesCount})` },
                    { id: "timeline_additions", label: `Timeline Additions (${timelineCount})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        activeTab === tab.id
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[180px] flex flex-col justify-between">
                {activeTab === "new_nodes" && (
                  newNodesCount === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No new node concepts added by the latest upload.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.new_nodes.map((node, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-start gap-3 hover:border-slate-800 transition-colors animate-fade-in">
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl shrink-0">
                            {renderCategoryIcon(node.type)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{node.label}</span>
                            <span className="text-[9px] text-emerald-400 font-bold block uppercase tracking-wider mt-0.5">{node.type}</span>
                            <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">{node.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "merged_nodes" && (
                  mergedNodesCount === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No existing node concepts were merged or consolidated.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.merged_nodes.map((node, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-start gap-3 hover:border-slate-800 transition-colors animate-fade-in">
                          <div className="p-2 bg-indigo-500/10 border border-indigo-500/25 rounded-xl shrink-0">
                            <Layers className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{node.label}</span>
                            <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider mt-0.5">Consolidated Node ({node.type})</span>
                            <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                              This concept already existed in the patient's memory. The new document successfully matched, enriched, and connected new relations to this same memory entity.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "new_edges" && (
                  newEdgesCount === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No new semantic connections built.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {data.new_edges.map((edge, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-[10px] animate-fade-in">
                          <span className="font-bold text-slate-200 truncate max-w-[120px]" title={edge.source}>{edge.source}</span>
                          <span className="flex items-center gap-1 font-bold text-violet-400 uppercase tracking-wider px-1.5 bg-slate-900 border border-slate-800 rounded shrink-0">
                            {edge.label.toLowerCase().replace(/_/g, " ")}
                            <ChevronRight className="w-3 h-3 text-violet-400" />
                          </span>
                          <span className="font-bold text-slate-200 truncate max-w-[120px]" title={edge.target}>{edge.target}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "timeline_additions" && (
                  timelineCount === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No timeline events added.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {data.timeline_additions.map((ev, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                              {renderCategoryIcon(ev.event_type)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">{ev.event}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase">
                                {ev.event_type} • Date: {ev.date}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty/No documents fallback */
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/10 flex flex-col items-center justify-center">
            <HelpCircle className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No Memory Uploads to Compare</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
              Memory evolution highlights changes in the patient's semantic graph after processing new reports. Upload a medical report in the patient portal to generate snapshot comparisons.
            </p>
            <Link
              href={`/patient/${patientId}/upload`}
              className="px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
            >
              Upload First Report
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}
