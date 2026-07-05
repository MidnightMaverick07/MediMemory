"use client";

import React, { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Heart, 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  Activity, 
  Search, 
  ExternalLink,
  ShieldAlert,
  Loader2,
  Stethoscope,
  Clock,
  BriefcaseMedical,
  CheckCircle2
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
  extracted_json?: {
    diseases?: string[];
    medications?: string[];
    [key: string]: any;
  };
}

interface ConditionGroup {
  name: string;
  occurrences: Array<{
    date: string;
    source: string;
    docId: number | null;
    docFilename: string | null;
    contextText: string | null;
  }>;
  firstMentioned: string;
  lastMentioned: string;
  associatedMedications: string[];
  associatedDoctors: string[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ConditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Patient details
      const patientRes = await fetch(`${API_BASE}/patients/${patientId}`);
      if (!patientRes.ok) throw new Error("Patient record not found.");
      const pData = await patientRes.json();
      setPatient(pData);

      // 2. Fetch Timeline & Documents
      const [timelineRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/patients/${patientId}/timeline`),
        fetch(`${API_BASE}/patients/${patientId}/documents`)
      ]);

      if (timelineRes.ok) {
        const tData = await timelineRes.json();
        setTimelineEvents(tData);
      }
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setDocuments(dData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load clinical condition overview.");
    } finally {
      setLoading(false);
    }
  };

  // Compile detailed condition intelligence
  const conditionGroups = useMemo((): ConditionGroup[] => {
    const groups: Record<string, ConditionGroup> = {};

    // 1. Scan timeline events
    timelineEvents.forEach(ev => {
      ev.diseases?.forEach(dis => {
        const normalized = dis.trim();
        if (!normalized) return;

        // Trace associated medications from graph links
        const linkedMeds: string[] = [];
        ev.graph_links?.forEach(link => {
          if (
            link.relation.toLowerCase().includes("prescribe") ||
            link.relation.toLowerCase().includes("treat") ||
            link.relation.toLowerCase().includes("for")
          ) {
            // If the disease is the source, associate the target (usually the medication)
            if (link.source.toLowerCase() === normalized.toLowerCase()) {
              linkedMeds.push(link.target);
            } else if (link.target.toLowerCase() === normalized.toLowerCase()) {
              linkedMeds.push(link.source);
            }
          }
        });

        // Trace associated doctors from entities
        const doctors = ev.entities?.doctor || ev.entities?.doctors || [];

        if (!groups[normalized]) {
          groups[normalized] = {
            name: normalized,
            occurrences: [],
            firstMentioned: ev.date,
            lastMentioned: ev.date,
            associatedMedications: [],
            associatedDoctors: []
          };
        }

        groups[normalized].occurrences.push({
          date: ev.date,
          source: ev.event,
          docId: ev.document_id,
          docFilename: ev.document_filename,
          contextText: ev.document_content
        });

        // Update dates
        if (new Date(ev.date) < new Date(groups[normalized].firstMentioned)) {
          groups[normalized].firstMentioned = ev.date;
        }
        if (new Date(ev.date) > new Date(groups[normalized].lastMentioned)) {
          groups[normalized].lastMentioned = ev.date;
        }

        // Add associations
        linkedMeds.forEach(m => {
          if (!groups[normalized].associatedMedications.includes(m)) {
            groups[normalized].associatedMedications.push(m);
          }
        });
        doctors.forEach(doc => {
          if (!groups[normalized].associatedDoctors.includes(doc)) {
            groups[normalized].associatedDoctors.push(doc);
          }
        });
      });
    });

    // 2. Scan parsed documents for additional occurrences
    documents.forEach(doc => {
      doc.extracted_json?.diseases?.forEach(dis => {
        const normalized = dis.trim();
        if (!normalized) return;

        if (!groups[normalized]) {
          groups[normalized] = {
            name: normalized,
            occurrences: [],
            firstMentioned: doc.upload_date.split("T")[0],
            lastMentioned: doc.upload_date.split("T")[0],
            associatedMedications: [],
            associatedDoctors: []
          };
        }

        // Check if we already logged this document occurrence
        const exists = groups[normalized].occurrences.some(occ => occ.docId === doc.id);
        if (!exists) {
          groups[normalized].occurrences.push({
            date: doc.upload_date.split("T")[0],
            source: `Document Upload: ${doc.filename}`,
            docId: doc.id,
            docFilename: doc.filename,
            contextText: doc.extracted_json?.findings?.join(", ") || doc.extracted_json?.diagnoses?.join(", ") || null
          });
        }
      });
    });

    // Sort occurrences chronologically
    Object.values(groups).forEach(g => {
      g.occurrences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [timelineEvents, documents]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    return conditionGroups.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.associatedMedications.some(m => m.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [conditionGroups, searchQuery]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Reconstructing patient diagnostic list...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center items-center py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-bold text-slate-200 mb-2">Failed to Load Conditions</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error || "Patient not found."}</p>
        <Link
          href={`/doctor/${patientId}/dashboard`}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[1440px] mx-auto p-6 flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-rose-500/10 to-pink-500/10 border border-rose-500/25 rounded-2xl flex items-center justify-center text-rose-400">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-tight">Patient Diagnostic List</h1>
            <p className="text-xs text-slate-400 mt-1">
              Active conditions, clinical diagnoses, and chronic disease indexes compiled for <strong className="text-slate-200">{patient.name}</strong>.
            </p>
          </div>
        </div>

        {/* Back Link */}
        <Link
          href={`/doctor/${patientId}/dashboard`}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 transition-colors self-start md:self-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard Overview
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search conditions or prescribed medications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/40 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredGroups.length} of {conditionGroups.length} unique conditions
        </div>
      </div>

      {/* Main Grid content */}
      {filteredGroups.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-slate-850 rounded-3xl bg-slate-900/10 flex flex-col items-center justify-center">
          <Heart className="w-12 h-12 text-slate-700 mb-3" />
          <h3 className="text-sm font-bold text-slate-400">No Conditions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            {searchQuery ? "Try adjusting your search filters." : "This patient has no recorded diagnoses in their clinical memory graph."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Conditions Card List (Left) */}
          <div className="lg:col-span-12 flex flex-col gap-6">
            {filteredGroups.map((group) => (
              <div 
                key={group.name}
                className="bg-slate-900/30 border border-slate-850 hover:border-rose-500/30 rounded-3xl p-6 backdrop-blur-sm shadow-sm transition-all flex flex-col gap-5 relative overflow-hidden group"
              >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl pointer-events-none rounded-full" />
                
                {/* Header Summary */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-850/50 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight group-hover:text-rose-400 transition-colors">
                        {group.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-1 font-medium">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> First Mentioned: {group.firstMentioned}</span>
                        <span className="text-slate-700">•</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-500" /> Latest Record: {group.lastMentioned}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Meta */}
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {group.associatedMedications.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Treatment:</span>
                        {group.associatedMedications.map(med => (
                          <span key={med} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-lg text-[10px] font-bold text-indigo-400">
                            {med}
                          </span>
                        ))}
                      </div>
                    )}
                    {group.associatedDoctors.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Providers:</span>
                        {group.associatedDoctors.map(doc => (
                          <span key={doc} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[9px] font-semibold text-slate-300">
                            {doc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Occurrence History Timeline */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3.5">Clinical Mentions ({group.occurrences.length})</h4>
                  <div className="flex flex-col gap-3.5">
                    {group.occurrences.map((occ, idx) => (
                      <div 
                        key={idx} 
                        className="flex gap-4 items-start pl-3 border-l-2 border-slate-800 hover:border-rose-500/30 transition-colors relative"
                      >
                        {/* Dot indicator */}
                        <div className="w-2 h-2 rounded-full bg-slate-750 absolute -left-[5px] top-1.5 group-hover:bg-rose-500 transition-colors" />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                          {/* Date and Event Summary */}
                          <div className="md:col-span-4">
                            <span className="text-[10px] font-bold font-mono text-rose-400 block">{occ.date}</span>
                            <span className="text-xs font-bold text-slate-200 mt-0.5 block">{occ.source}</span>
                          </div>

                          {/* Detail / Context Snippet */}
                          <div className="md:col-span-5 text-xs text-slate-400 font-medium leading-relaxed italic bg-slate-950/20 border border-slate-900 p-2.5 rounded-xl">
                            {occ.contextText ? `"${occ.contextText.substring(0, 150)}${occ.contextText.length > 150 ? '...' : ''}"` : "No direct context snippet extracted."}
                          </div>

                          {/* Reference report link */}
                          <div className="md:col-span-3 flex justify-end items-start">
                            {occ.docId ? (
                              <Link
                                href={`/patient/${patientId}/upload`}
                                className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-xl transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {occ.docFilename || "Open Report"}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-600 italic">Self-Reported/Timeline</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
