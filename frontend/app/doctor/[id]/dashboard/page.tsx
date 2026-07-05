"use client";

import React, { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { 
  ClipboardList, 
  RefreshCw, 
  Calendar, 
  Heart,
  Stethoscope, 
  BriefcaseMedical,
  User,
  Activity,
  AlertTriangle,
  Pill,
  FileText,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Network,
  Database,
  ShieldAlert,
  Sparkles,
  Clock,
  UserCheck
} from "lucide-react";

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  demographics: {
    blood_group?: string;
    height?: string;
    weight?: string;
    emergency_contact?: string;
    [key: string]: any;
  };
}

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

interface Document {
  id: number;
  patient_id: number;
  filename: string;
  doc_type: string;
  upload_date: string;
  status: string;
  error_message?: string;
  extracted_text?: string;
  extracted_json?: Record<string, any>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DoctorDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Patient details
      const patientRes = await fetch(`${API_BASE}/patients/${patientId}`);
      if (!patientRes.ok) {
        throw new Error("Patient record not found.");
      }
      const pData = await patientRes.json();
      setPatient(pData);

      // 2. Fetch Summary, Timeline, and Documents
      await Promise.all([
        fetchSummary(),
        fetchTimeline(),
        fetchDocuments()
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load clinical dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary_content);
      }
    } catch (err) {
      console.error("Error fetching patient summary:", err);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (err) {
      console.error("Error fetching timeline events:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchTimeline(),
        fetchDocuments()
      ]);
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

  // Helper to get initials
  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  // Dynamic conditions aggregation
  const conditions = useMemo(() => {
    const list = new Set<string>();
    timelineEvents.forEach(ev => {
      ev.diseases?.forEach(d => list.add(d));
    });
    documents.forEach(doc => {
      doc.extracted_json?.diseases?.forEach((d: string) => list.add(d));
    });
    return Array.from(list);
  }, [timelineEvents, documents]);

  // Dynamic medications aggregation
  const medications = useMemo(() => {
    const list = new Set<string>();
    timelineEvents.forEach(ev => {
      ev.medications?.forEach(m => list.add(m));
    });
    documents.forEach(doc => {
      doc.extracted_json?.medications?.forEach((m: string) => list.add(m));
    });
    return Array.from(list);
  }, [timelineEvents, documents]);

  // Dynamic allergies aggregation
  const allergies = useMemo(() => {
    const list = new Set<string>();
    timelineEvents.forEach(ev => {
      if (ev.entities) {
        Object.entries(ev.entities).forEach(([key, values]) => {
          if (key.toLowerCase() === "allergies" || key.toLowerCase() === "allergy") {
            if (Array.isArray(values)) {
              values.forEach(v => list.add(v));
            }
          }
        });
      }
    });
    documents.forEach(doc => {
      doc.extracted_json?.allergies?.forEach((a: string) => list.add(a));
    });
    return Array.from(list);
  }, [timelineEvents, documents]);

  // Recent 5 Reports
  const recentReports = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
      .slice(0, 5);
  }, [documents]);

  const renderEventIcon = (type: string) => {
    switch (type) {
      case "diagnosis":
        return <Activity className="w-3.5 h-3.5 text-emerald-400" />;
      case "surgery":
        return <BriefcaseMedical className="w-3.5 h-3.5 text-rose-400" />;
      case "medication_change":
        return <Pill className="w-3.5 h-3.5 text-amber-400" />;
      case "lab_report":
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case "checkup":
      default:
        return <Heart className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

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

  const renderTextWithCitations = (text: string) => {
    const regex = /\[([^\]]+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      
      const nodeName = match[1];
      parts.push(
        <Link
          key={matchIndex}
          href={`/doctor/${patientId}/graph?highlight=${encodeURIComponent(nodeName)}`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/35 hover:border-indigo-400 text-[10px] font-black text-indigo-300 transition-all select-none hover:shadow-[0_0_8px_rgba(99,102,241,0.4)]"
          title={`Find [${nodeName}] in Relationship Explorer`}
        >
          <Network className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          {nodeName}
        </Link>
      );
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Recalling patient clinical snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-200 mb-2">Error Loading Dashboard</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">{error || "Patient not found."}</p>
          <Link
            href="/"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[1440px] mx-auto p-6 flex flex-col gap-6 selection:bg-indigo-500 selection:text-white">
        
        {/* Patient Snapshot Banner */}
        <div className="relative overflow-hidden bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-600/15 to-indigo-600/15 border-2 border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
              <span className="text-xl font-black tracking-tight">{getInitials(patient.name)}</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-white tracking-tight">{patient.name}</h2>
                <span className="text-xs px-2.5 py-0.5 bg-slate-850 text-slate-300 rounded-md font-bold border border-slate-700/60 uppercase tracking-wide">
                  {patient.gender} • Age {patient.age}
                </span>
              </div>
              
              {/* Demographics grid */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-400 font-medium">
                {patient.demographics?.blood_group && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Blood Type: <strong className="text-slate-200">{patient.demographics.blood_group}</strong>
                  </span>
                )}
                {patient.demographics?.height && (
                  <span>Height: <strong className="text-slate-200">{patient.demographics.height} cm</strong></span>
                )}
                {patient.demographics?.weight && (
                  <span>Weight: <strong className="text-slate-200">{patient.demographics.weight} kg</strong></span>
                )}
                {patient.demographics?.emergency_contact && (
                  <span className="hidden sm:inline border-l border-slate-850 pl-4 text-slate-400">
                    Emergency: <strong className="text-slate-200">{patient.demographics.emergency_contact}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start md:self-auto flex items-center gap-2 px-4.5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-bold text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh memory graph
          </button>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR (Quick Actions, Conditions, Medications, Allergies) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Quick Actions Panel */}
            <div className="bg-slate-900/35 border border-slate-850 rounded-3xl p-5 backdrop-blur-sm shadow-md">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2.5">
                <Link
                  href={`/doctor/${patientId}/query`}
                  className="flex items-center justify-between p-3.5 bg-indigo-600/10 hover:bg-indigo-600/15 border border-indigo-500/25 rounded-2xl text-xs font-bold text-indigo-300 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-indigo-400" />
                    Ask AI Clinical Memory
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href={`/doctor/${patientId}/graph`}
                  className="flex items-center justify-between p-3.5 bg-violet-600/10 hover:bg-violet-600/15 border border-violet-500/25 rounded-2xl text-xs font-bold text-violet-300 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-violet-400" />
                    Open Relationship Graph
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href={`/patient/${patientId}/timeline`}
                  className="flex items-center justify-between p-3.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-2xl text-xs font-bold text-slate-300 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    View Health Timeline
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Current Conditions Card */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-5 backdrop-blur-sm shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-cyan-400" />
                  Current Conditions
                </h3>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold">
                  {conditions.length} Active
                </span>
              </div>
              {conditions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No chronic conditions registered.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {conditions.map((cond, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 px-3 py-1.5 rounded-xl hover:border-cyan-500/40 transition-colors"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Current Medications Card */}
            <div className="bg-slate-900/30 border border-slate-855 rounded-3xl p-5 backdrop-blur-sm shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-amber-400" />
                  Active Medications
                </h3>
                <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                  {medications.length} Prescribed
                </span>
              </div>
              {medications.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No active medications found.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medications.map((med, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-bold bg-amber-950/40 text-amber-400 border border-amber-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:border-amber-500/40 transition-colors"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      {med}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies Card */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-5 backdrop-blur-sm shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Documented Allergies
                </h3>
                <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold">
                  {allergies.length} Highlighted
                </span>
              </div>
              {allergies.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No allergies documented in memory.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((all, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-bold bg-rose-950/40 text-rose-400 border border-rose-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:border-rose-500/40 transition-colors"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {all}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN (Summary, Recent Reports, Timeline) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Clinical Memory Summary */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 md:p-8 backdrop-blur-sm flex flex-col gap-5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">Clinical Memory Summary</h3>
                </div>
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20 rounded uppercase">
                  Cognee Remember + Improve
                </span>
              </div>
              <div className="h-[1px] bg-slate-800 w-full" />
              
              {refreshing ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                  <span>Synthesizing cognitive health context...</span>
                </div>
              ) : summary ? (
                <div className="text-sm leading-relaxed text-slate-300 space-y-4 max-w-none prose prose-invert prose-sm">
                  {summary.split("\n").map((line, idx) => {
                    if (line.startsWith("#")) {
                      const level = line.match(/^#+/)?.[0].length || 1;
                      const text = line.replace(/^#+\s*/, "");
                      return (
                        <h4 key={idx} className="text-indigo-400 font-bold mt-4 mb-2 text-xs tracking-wider uppercase">
                          {text}
                        </h4>
                      );
                    }
                    if (line.startsWith("-") || line.startsWith("*")) {
                      return (
                        <li key={idx} className="ml-4 list-disc pl-1 text-slate-350">
                          {renderTextWithCitations(line.replace(/^[-*]\s*/, ""))}
                        </li>
                      );
                    }
                    return line.trim() ? <p key={idx} className="text-slate-300">{renderTextWithCitations(line)}</p> : null;
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-8 text-center">
                  No clinical summary compiled. Try uploading patient clinical notes or records.
                </p>
              )}
            </div>

            {/* Recent Reports Card */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 backdrop-blur-sm flex flex-col gap-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Reports (Vault)</h3>
                </div>
                <Link
                  href={`/patient/${patientId}/upload`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                >
                  Upload New
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="h-[1px] bg-slate-800/80 w-full" />
              
              {recentReports.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No reports uploaded yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentReports.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-4 p-3 bg-slate-950/30 border border-slate-850 hover:border-slate-800 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{doc.filename}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium uppercase">
                            {doc.doc_type} • Uploaded {new Date(doc.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`text-[9px] font-bold px-2 py-0.5 border rounded uppercase ${
                        doc.status === "completed" 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : doc.status === "processing"
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline Snapshot (Expandable Chronological ledger) */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 backdrop-blur-sm flex flex-col gap-5 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Timeline Snapshot</h3>
                </div>
                <Link
                  href={`/patient/${patientId}/timeline`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
                >
                  View Full Timeline
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="h-[1px] bg-slate-800/80 w-full" />

              {refreshing ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                  <span>Traversing chronological graphs...</span>
                </div>
              ) : timelineEvents.length > 0 ? (
                <div className="relative pl-6 border-l border-slate-850 space-y-5 py-2">
                  {timelineEvents.slice(0, 4).map((ev) => {
                    const isExpanded = !!expandedEvents[ev.id];
                    return (
                      <div key={ev.id} className="relative group transition-all duration-300">
                        {/* Circle node on timeline */}
                        <div className="absolute -left-[31px] top-3.5 w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center ring-4 ring-slate-950 transition-all group-hover:border-indigo-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-indigo-400" />
                        </div>

                        <div
                          onClick={() => toggleExpand(ev.id)}
                          className="cursor-pointer p-4 bg-slate-950/20 border border-slate-850 hover:border-slate-700/80 rounded-2xl transition-all flex flex-col gap-3 shadow-sm select-none"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 border rounded-lg ${getIconContainerClass(ev.event_type)}`}>
                                {renderEventIcon(ev.event_type)}
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block leading-none">
                                  {ev.event_type.replace("_", " ")}
                                </span>
                                <span className="text-xs text-indigo-400 font-bold mt-1 block leading-none">
                                  {ev.date}
                                </span>
                              </div>
                            </div>
                            <div className="text-slate-400 group-hover:text-white p-1 rounded-lg bg-slate-850/40 border border-slate-800 transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                            {ev.event}
                          </p>

                          {/* Quick pill indicators */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ev.diseases.slice(0, 2).map((dis, i) => (
                              <span key={i} className="text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                {dis}
                              </span>
                            ))}
                            {ev.medications.slice(0, 2).map((med, i) => (
                              <span key={i} className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                {med}
                              </span>
                            ))}
                          </div>

                          {/* Expanded Details section */}
                          {isExpanded && (
                            <div
                              className="mt-2 pt-3.5 border-t border-slate-850 flex flex-col gap-4 animate-slide-down"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Extracted Clinical Entities */}
                              {Object.keys(ev.entities).length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <Database className="w-3 h-3 text-indigo-400" />
                                    Clinical Annotations
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(ev.entities).map(([category, vals], idx) => (
                                      <div key={idx} className="p-2.5 bg-slate-900 border border-slate-855 rounded-xl">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                                          {category}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {vals.map((v, i) => (
                                            <span key={i} className="text-[9px] bg-slate-950 text-slate-350 border border-slate-850 px-1.5 py-0.5 rounded">
                                              {v}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Semantic Graph Connections */}
                              {ev.graph_links && ev.graph_links.length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <Network className="w-3 h-3 text-indigo-400" />
                                    Semantic Connections
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ev.graph_links.map((link, idx) => (
                                      <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[9px] font-medium text-slate-300">
                                        <span className="font-bold text-slate-200">{link.source}</span>
                                        <span className="text-[8px] font-semibold px-1 text-indigo-400 bg-slate-900 border border-indigo-950 rounded uppercase">
                                          {link.relation}
                                        </span>
                                        <span className="font-bold text-slate-200">{link.target}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Original doc snippet */}
                              {ev.document_content && (
                                <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Original Report Snippet
                                  </h4>
                                  <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl max-h-32 overflow-y-auto font-mono text-[10px] text-slate-400 leading-normal scrollbar-thin">
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
                <p className="text-xs text-slate-500 italic py-6 text-center">No timeline events compiled yet.</p>
              )}
            </div>

          </div>

        </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.15); border-radius: 99px; }
      `}</style>
    </div>
  );
}
