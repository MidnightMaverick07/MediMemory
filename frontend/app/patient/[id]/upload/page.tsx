"use client";

import React, { use, useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Clock,
  AlertCircle,
  Activity,
  Image as ImageIcon,
  File,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Pill,
  Stethoscope,
  Building2,
  User,
  CalendarDays,
  Zap,
  Scissors,
  ShieldAlert,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ExtractedJson {
  diseases?: string[];
  medications?: string[];
  allergies?: string[];
  doctors?: string[];
  hospitals?: string[];
  dates?: string[];
  lab_values?: string[];
  symptoms?: string[];
  surgeries?: string[];
}

interface Document {
  id: number;
  patient_id: number;
  filename: string;
  doc_type: string;
  upload_date: string;
  status: string;
  error_message: string | null;
  extracted_json: ExtractedJson | null;
}

interface ActivityLog {
  id: number;
  patient_id: number;
  event_type: string;
  details: string;
  timestamp: string;
}

type PipelineStep = {
  label: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
};

const INITIAL_PIPELINE: PipelineStep[] = [
  { label: "Upload Received", description: "File saved to server", status: "pending" },
  { label: "OCR / Text Extraction", description: "Parsing document content", status: "pending" },
  { label: "Memory Indexing", description: "cognee.remember() running", status: "pending" },
  { label: "Timeline Extraction", description: "Parsing medical events", status: "pending" },
  { label: "Graph Enrichment", description: "Building ontology graph", status: "pending" },
];

const ENTITY_CATEGORIES = [
  { key: "diseases", label: "Diseases", icon: Activity, color: "rose" },
  { key: "medications", label: "Medications", icon: Pill, color: "amber" },
  { key: "lab_values", label: "Lab Values", icon: FlaskConical, color: "sky" },
  { key: "symptoms", label: "Symptoms", icon: Zap, color: "violet" },
  { key: "surgeries", label: "Surgeries", icon: Scissors, color: "red" },
  { key: "allergies", label: "Allergies", icon: ShieldAlert, color: "orange" },
  { key: "doctors", label: "Doctors", icon: User, color: "emerald" },
  { key: "hospitals", label: "Hospitals", icon: Building2, color: "cyan" },
  { key: "dates", label: "Dates", icon: CalendarDays, color: "indigo" },
];

const colorMap: Record<string, string> = {
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function PatientUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [docType, setDocType] = useState("Lab Report");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStep[]>(INITIAL_PIPELINE);
  const [pipelineDocId, setPipelineDocId] = useState<number | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchActivityLogs();
  }, [patientId]);

  // Poll for status updates while there are processing files
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "uploaded" || d.status === "processing"
    );
    if (!hasProcessing) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const interval = setInterval(() => {
      fetchDocuments();
      fetchActivityLogs();
    }, 3000);
    pollRef.current = interval;
    return () => clearInterval(interval);
  }, [documents]);

  // Advance pipeline stepper based on doc status
  useEffect(() => {
    if (!pipelineDocId) return;
    const doc = documents.find((d) => d.id === pipelineDocId);
    if (!doc) return;

    if (doc.status === "uploaded") {
      setPipeline(advance(INITIAL_PIPELINE, 0));
    } else if (doc.status === "processing") {
      setPipeline(advance(INITIAL_PIPELINE, 2));
    } else if (doc.status === "completed") {
      setPipeline(INITIAL_PIPELINE.map((s) => ({ ...s, status: "done" })));
    } else if (doc.status === "failed") {
      setPipeline((prev) => prev.map((s, i) => i <= 1 ? { ...s, status: "error" } : s));
    }
  }, [documents, pipelineDocId]);

  function advance(steps: PipelineStep[], activeIdx: number): PipelineStep[] {
    return steps.map((s, i) => ({
      ...s,
      status: i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
    }));
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/documents`);
      if (res.ok) setDocuments(await res.json());
    } catch {}
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/activity`);
      if (res.ok) setActivityLogs(await res.json());
    } catch {}
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleFileSelect = (f: File) => {
    setSelectedFile(f);
    setUploadError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setPipeline(advance(INITIAL_PIPELINE, 0));
    setPipelineDocId(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("doc_type", docType);

    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const doc: Document = await res.json();
      setPipelineDocId(doc.id);
      setPipeline(advance(INITIAL_PIPELINE, 1));
      setSelectedFile(null);
      setFilePreview(null);
      fetchDocuments();
      fetchActivityLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setUploadError(msg);
      setPipeline(INITIAL_PIPELINE.map((s, i) => i === 0 ? { ...s, status: "error" } : s));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Delete this document and remove its memory? This cannot be undone.")) return;
    await fetch(`${API_BASE}/patients/${patientId}/documents/${docId}`, { method: "DELETE" });
    fetchDocuments();
    fetchActivityLogs();
    if (pipelineDocId === docId) {
      setPipelineDocId(null);
      setPipeline(INITIAL_PIPELINE);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg"].includes(ext || "")) return <ImageIcon className="w-4 h-4 text-sky-400" />;
    if (ext === "pdf") return <File className="w-4 h-4 text-rose-400" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle2 className="w-3 h-3" />Indexed</span>;
      case "processing":
        return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><RefreshCw className="w-3 h-3 animate-spin" />Processing</span>;
      case "uploaded":
        return <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400"><Clock className="w-3 h-3" />Queued</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400"><AlertCircle className="w-3 h-3" />Failed</span>;
    }
  };

  const getPipelineStepIcon = (status: PipelineStep["status"]) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "active": return <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />;
      case "error": return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default: return <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header currentPatientId={patientId} activePortal="patient" activeTab="upload" />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">

        {/* Upload Panel */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Upload Medical Report
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Accepted: <strong className="text-slate-300">PDF, PNG, JPG</strong>, TXT. Images are processed through Gemini Vision OCR before indexing.
              Every upload automatically runs the full pipeline: OCR → Memory Indexing → Timeline Extraction → Graph Enrichment.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 flex flex-col items-center justify-center gap-3 min-h-[160px]
              ${dragOver ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]" : "border-slate-700 hover:border-slate-600 bg-slate-900/20 hover:bg-slate-900/40"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-3 w-full">
                {filePreview ? (
                  <img src={filePreview} alt="preview" className="max-h-32 rounded-xl border border-slate-700 object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                    {getFileIcon(selectedFile.name)}
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFilePreview(null); }}
                  className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">Drop a file or click to browse</p>
                  <p className="text-xs text-slate-500 mt-0.5">PDF, PNG, JPG up to 20MB</p>
                </div>
              </>
            )}
          </div>

          {/* Doc Type + Upload Button */}
          {selectedFile && (
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
              >
                {["Lab Report", "Prescription", "Discharge Summary", "MRI / Scan Report", "Annual Review", "Surgical Report", "Follow-Up Note", "Other"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploading ? "Uploading..." : "Upload & Index"}
              </button>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Pipeline Stepper */}
          {pipelineDocId && (
            <div className="mt-1 p-4 bg-slate-950/50 border border-slate-850 rounded-2xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Processing Pipeline</p>
              <div className="flex flex-col gap-2.5">
                {pipeline.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {getPipelineStepIcon(step.status)}
                    <div>
                      <p className={`text-xs font-semibold ${step.status === "done" ? "text-emerald-400" : step.status === "active" ? "text-indigo-300" : step.status === "error" ? "text-rose-400" : "text-slate-500"}`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Vault */}
        <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-6 backdrop-blur-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Document Vault
            <span className="ml-auto text-[10px] font-semibold text-slate-500">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
          </h3>

          {documents.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-slate-600">
              <Upload className="w-10 h-10 mb-3" />
              <p className="text-xs italic">No reports uploaded yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {documents.map((doc) => {
                const isExpanded = !!expandedDocs[doc.id];
                const hasEntities = doc.extracted_json && Object.values(doc.extracted_json).some((v) => v && v.length > 0);
                return (
                  <div key={doc.id} className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/30">
                    {/* Doc header row */}
                    <div className="flex items-center gap-3 p-4">
                      <div className="flex-shrink-0">{getFileIcon(doc.filename)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{doc.filename}</p>
                        <p className="text-[10px] text-slate-500">{doc.doc_type} · {new Date(doc.upload_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {hasEntities && (
                          <button
                            onClick={() => setExpandedDocs((p) => ({ ...p, [doc.id]: !p[doc.id] }))}
                            className="text-slate-400 hover:text-white p-1 rounded-lg border border-slate-800 bg-slate-900/40"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {doc.error_message && (
                      <p className="text-[10px] text-rose-400 px-4 pb-3">{doc.error_message}</p>
                    )}

                    {/* Extracted Entities Panel */}
                    {isExpanded && doc.extracted_json && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-850">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider my-3">Extracted Entities</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {ENTITY_CATEGORIES.map(({ key, label, icon: Icon, color }) => {
                            const vals = (doc.extracted_json as Record<string, string[]>)[key];
                            if (!vals || vals.length === 0) return null;
                            return (
                              <div key={key} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Icon className={`w-3 h-3 text-${color}-400`} />
                                  <span className={`text-[10px] font-bold text-${color}-400 uppercase tracking-wider`}>{label}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {vals.map((v, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${colorMap[color]}`}>
                                      {v}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        {activityLogs.length > 0 && (
          <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-indigo-400" />
              Pipeline Activity Feed
            </h3>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs py-2 border-b border-slate-900 last:border-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 leading-relaxed">{log.details}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
