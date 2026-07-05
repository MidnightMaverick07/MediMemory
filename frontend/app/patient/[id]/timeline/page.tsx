"use client";

import React, { use, useState, useEffect } from "react";
import Header from "@/components/Header";
import { 
  Calendar, 
  RefreshCw, 
  Activity, 
  ArrowRight, 
  Brain, 
  Scissors, 
  FileText, 
  Heart, 
  Pill, 
  ChevronDown, 
  ChevronUp, 
  Network,
  Database
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TimelineEvent {
  id: number;
  patient_id: number;
  document_id: number | null;
  document_filename: string | null;
  document_content: string | null;
  date: string;
  event: string;
  event_type: string;
  diseases: string[];
  medications: string[];
  entities: Record<string, string[]>;
  graph_links: Array<{ source: string; target: string; relation: string }>;
  timestamp: string;
}

export default function PatientTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchTimeline();
  }, [patientId]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTimeline();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (eventId: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Helper to render the appropriate clinical icon for the event category
  const renderEventIcon = (type: string) => {
    switch (type) {
      case "diagnosis":
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case "surgery":
        return <Scissors className="w-4 h-4 text-rose-400" />;
      case "medication_change":
        return <Pill className="w-4 h-4 text-amber-400" />;
      case "lab_report":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "checkup":
      default:
        return <Heart className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Helper to format the type label nicely
  const formatEventType = (type: string) => {
    return type.replace("_", " ").toUpperCase();
  };

  // Get CSS classes for the icon container based on event type
  const getIconContainerClass = (type: string) => {
    switch (type) {
      case "diagnosis":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "surgery":
        return "bg-rose-500/10 border-rose-500/20";
      case "medication_change":
        return "bg-amber-500/10 border-amber-500/20";
      case "lab_report":
        return "bg-sky-500/10 border-sky-500/20";
      case "checkup":
      default:
        return "bg-indigo-500/10 border-indigo-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Header currentPatientId={patientId} activePortal="patient" activeTab="timeline" />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* Title & Info Banner */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Lifelong Health Timeline
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 font-medium leading-relaxed max-w-xl">
              A structured chronological ledger of diagnosis details, hospital procedures, medication edits, and lab workups. Click any event card to view the original medical text, extracted entities, and knowledge graph relationships.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? "animate-spin" : ""}`} />
            Refresh Timeline
          </button>
        </div>

        {/* Timeline Body */}
        <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-6 backdrop-blur-sm min-h-[300px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-xs text-slate-500 font-medium">Traversing medical graph hierarchy...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="relative pl-6 sm:pl-8 border-l border-slate-850 space-y-6 py-2">
              {events.map((ev) => {
                const isExpanded = !!expandedEvents[ev.id];
                return (
                  <div key={ev.id} className="relative group animate-fade-in">
                    
                    {/* Circle Timeline Connector on the Left Border */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-4 w-4 h-4 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center ring-4 ring-slate-950 transition-all group-hover:border-indigo-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-indigo-400" />
                    </div>

                    <div 
                      onClick={() => toggleExpand(ev.id)}
                      className="cursor-pointer p-5 bg-slate-900/40 border border-slate-850 hover:border-slate-700 rounded-2xl transition-all shadow-sm flex flex-col gap-4"
                    >
                      {/* Top Header Row of Card */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 border rounded-xl flex items-center justify-center ${getIconContainerClass(ev.event_type)}`}>
                            {renderEventIcon(ev.event_type)}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                              {formatEventType(ev.event_type)}
                            </span>
                            <span className="text-xs text-indigo-400 font-bold mt-0.5 block">
                              {ev.date}
                            </span>
                          </div>
                        </div>

                        {/* Expand / Collapse Indicator */}
                        <div className="text-slate-400 group-hover:text-white p-1 rounded-lg bg-slate-850/40 border border-slate-800">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Main Event Description */}
                      <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                        {ev.event}
                      </p>

                      {/* Summary Badges (Related Report, Diseases, Medications) */}
                      <div className="flex flex-wrap items-center gap-2">
                        {ev.document_filename && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold bg-slate-800/80 text-slate-300 border border-slate-750 px-2 py-0.5 rounded-md">
                            <Database className="w-2.5 h-2.5 text-indigo-400" />
                            {ev.document_filename}
                          </span>
                        )}
                        {ev.diseases.map((dis, i) => (
                          <span key={i} className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-md">
                            {dis}
                          </span>
                        ))}
                        {ev.medications.map((med, i) => (
                          <span key={i} className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-md">
                            {med}
                          </span>
                        ))}
                      </div>

                      {/* Expanded Section Details */}
                      {isExpanded && (
                        <div 
                          className="mt-2 pt-4 border-t border-slate-850 flex flex-col gap-5 animate-slide-down"
                          onClick={(e) => e.stopPropagation()} // Stop toggle when clicking inside details
                        >
                          {/* 1. Categorized Extracted Entities Grid */}
                          {Object.keys(ev.entities).length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                                <Database className="w-3 h-3 text-indigo-400" />
                                Clinical Annotations
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(ev.entities).map(([category, vals], idx) => (
                                  <div key={idx} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1.5">
                                      {category}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {vals.map((v, i) => (
                                        <span key={i} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded">
                                          {v}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Semantic Memory Graph Relationships */}
                          {ev.graph_links.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                                <Network className="w-3 h-3 text-indigo-400" />
                                Semantic Connections
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {ev.graph_links.map((link, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px]">
                                    <span className="font-bold text-slate-200">{link.source}</span>
                                    <span className="flex items-center gap-1 font-semibold text-indigo-400 uppercase tracking-wider px-1 bg-slate-950/60 border border-indigo-950 rounded">
                                      {link.relation}
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </span>
                                    <span className="font-bold text-slate-200">{link.target}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Original Upload Report Text */}
                          {ev.document_content && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-300 mb-2">
                                Original Report Content
                              </h4>
                              <div className="p-4 bg-slate-950/70 border border-slate-900 rounded-2xl max-h-48 overflow-y-auto font-mono text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap scrollbar-thin scrollbar-thumb-slate-800">
                                {ev.document_content}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Brain className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-xs italic">No timeline entries found in memory.</p>
              <p className="text-[10px] text-slate-600 max-w-xs mt-1">
                Upload clinical notes or lab results in the Vault view to automatically parse and populate this chronological trajectory.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
