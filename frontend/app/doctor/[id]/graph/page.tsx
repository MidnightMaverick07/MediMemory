"use client";

import React, { use, useState, useEffect, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import {
  Activity, Pill, FileText, Stethoscope, Heart,
  ChevronRight, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2,
  RotateCcw, X, ExternalLink, User, Hospital, AlertTriangle
} from "lucide-react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";

/* ───── types ───── */
interface Patient { id: number; name: string; age: number; gender: string; demographics?: Record<string, string>; }
interface RawNode { id: string; label: string; type: string; description: string; }
interface RawEdge { source: string; target: string; label: string; }

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ──── category config ──── */
const CAT: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  disease:        { color: "#22d3ee", bg: "rgba(34,211,238,.12)", border: "rgba(34,211,238,.45)", icon: <Heart className="w-3.5 h-3.5" />,        label: "Conditions" },
  medication:     { color: "#facc15", bg: "rgba(250,204,21,.10)", border: "rgba(250,204,21,.40)", icon: <Pill className="w-3.5 h-3.5" />,         label: "Medications" },
  report:         { color: "#f97316", bg: "rgba(249,115,22,.10)", border: "rgba(249,115,22,.40)", icon: <FileText className="w-3.5 h-3.5" />,     label: "Reports" },
  surgery:        { color: "#34d399", bg: "rgba(52,211,153,.10)", border: "rgba(52,211,153,.40)", icon: <Stethoscope className="w-3.5 h-3.5" />,  label: "Procedures" },
  patient:        { color: "#818cf8", bg: "rgba(129,140,248,.15)", border: "rgba(129,140,248,.55)", icon: <Activity className="w-3.5 h-3.5" />,    label: "Patient" },
  doctor:         { color: "#f472b6", bg: "rgba(244,114,182,.10)", border: "rgba(244,114,182,.40)", icon: <User className="w-3.5 h-3.5" />,         label: "Doctors" },
  hospital:       { color: "#fb7185", bg: "rgba(251,113,133,.10)", border: "rgba(251,113,133,.40)", icon: <Hospital className="w-3.5 h-3.5" />,     label: "Hospitals" },
  allergy:        { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.45)", icon: <AlertTriangle className="w-3.5 h-3.5" />, label: "Allergies" },
  timeline_event: { color: "#c084fc", bg: "rgba(192,132,252,.10)", border: "rgba(192,132,252,.40)", icon: <Activity className="w-3.5 h-3.5" />,      label: "Events" },
  concept:        { color: "#38bdf8", bg: "rgba(56,189,248,.10)", border: "rgba(56,189,248,.40)", icon: <Activity className="w-3.5 h-3.5" />,       label: "Concepts" },
};
const defaultCat = { color: "#94a3b8", bg: "rgba(148,163,184,.08)", border: "rgba(148,163,184,.30)", icon: <Activity className="w-3.5 h-3.5" />, label: "Other" };
const catOf = (t: string) => CAT[t] || defaultCat;

const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

const normalizeNodeType = (node: RawNode, allEdges: RawEdge[]): string => {
  if (node.type !== "concept") {
    return node.type;
  }
  
  const labelLower = node.label.toLowerCase();
  
  // 1. Check for medications (mg, mcg, ml, names, etc.)
  const medKeywords = ["metformin", "lisinopril", "atorvastatin", "gabapentin", "insulin", "aspirin", "ibuprofen", "mg", "mcg", "ml", "tablet", "capsule", "pill"];
  if (medKeywords.some(kw => labelLower.includes(kw))) {
    return "medication";
  }
  
  // 2. Check for procedures (surgery, laparoscopy, biopsy, excision, etc.)
  const procedureKeywords = ["surgery", "laparoscopy", "biopsy", "excision", "resection", "reconstruction", "bypass", "transplant", "amputation", "stent", "graft"];
  if (procedureKeywords.some(kw => labelLower.includes(kw))) {
    return "surgery";
  }

  // 3. Check for diseases / conditions
  const diseaseKeywords = ["diabetes", "neuropathy", "hypertension", "gerd", "asthma", "hyperlipidemia", "retinopathy", "insufficiency", "failure", "infection", "cold", "flu", "pain", "cancer", "tumor", "stroke", "arthritis", "dermatitis"];
  if (diseaseKeywords.some(kw => labelLower.includes(kw))) {
    return "disease";
  }

  // 4. Check edge relationships
  const edges = allEdges.filter(e => e.source === node.id || e.target === node.id);
  for (const edge of edges) {
    const rel = edge.label.toLowerCase();
    if (rel.includes("diagnosed") || rel.includes("complication") || rel.includes("complicates") || rel.includes("symptom")) {
      return "disease";
    }
    if (rel.includes("prescribed") || rel.includes("treated") || rel.includes("treatment")) {
      return "medication";
    }
    if (rel.includes("undergone") || rel.includes("underwent") || rel.includes("performed")) {
      return "surgery";
    }
  }
  
  return "concept";
};

/* ── Custom Node Component ── */
/* ── Custom Node Component ── */
const CustomNode = ({ data }: { data: any }) => {
  const { label, type, isPatient, isSelected, isDimmed, isHeader, isMore, isLess } = data;
  const cat = catOf(type);
  
  if (isHeader) {
    return (
      <div className="px-3 py-1.5 bg-slate-900/90 border border-slate-800/80 text-[10px] font-black tracking-widest uppercase rounded-xl select-none text-center shadow-lg"
           style={{ color: cat.color, borderColor: cat.border }}>
        {label}
      </div>
    );
  }

  if (isMore) {
    return (
      <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border-2 bg-slate-950/90 font-bold transition-all duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
           style={{ borderColor: cat.color, color: cat.color }}>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <span className="text-[10px] font-black leading-none">{label}</span>
        <span className="text-[7.5px] font-bold uppercase tracking-wider mt-0.5 opacity-80">more</span>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  if (isLess) {
    return (
      <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border-2 bg-slate-950/90 font-bold transition-all duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
           style={{ borderColor: cat.color, color: cat.color }}>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <span className="text-[10px] font-black leading-none">{label}</span>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }
  
  if (isPatient) {
    return (
      <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 bg-gradient-to-tr from-blue-700 to-indigo-650 transition-all duration-300 relative ${isSelected ? 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.65)] scale-110' : 'border-indigo-500/80'} ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <span className="text-white text-base font-black leading-none">{initials(label)}</span>
        <span className="absolute top-18 text-[11px] font-bold text-white whitespace-nowrap leading-none select-none">
          {label}
        </span>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // Circular with side text (Medications & Lab Results)
  if (type === "medication" || type === "allergy" || type === "concept" || type === "doctor" || type === "hospital") {
    let title = label;
    let subtitle = cat.label;
    
    // Formatting values beautifully if they contain details
    if (label.includes(" - ")) {
      const parts = label.split(" - ");
      title = parts[0];
      subtitle = parts[1];
    } else if (label.toLowerCase().includes("hb1ac") || label.toLowerCase().includes("hba1c")) {
      title = "HbA1c";
      subtitle = label.replace(/hba1c\s*/gi, "");
    } else if (label.toLowerCase().includes("cholesterol")) {
      title = "Cholesterol (LDL)";
      subtitle = label.replace(/cholesterol\s*(l(dl)?)?\s*/gi, "");
    } else if (label.toLowerCase().includes("triglycerides")) {
      title = "Triglycerides";
      subtitle = label.replace(/triglycerides\s*/gi, "");
    }
    
    return (
      <div className={`flex items-center gap-2.5 bg-transparent border-0 transition-all duration-300 ${isSelected ? 'scale-105' : ''}`}
           style={{ opacity: isDimmed ? 0.3 : 1 }}>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        
        {/* Circular icon badge */}
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 bg-slate-950 transition-all`}
             style={{
               borderColor: isSelected ? cat.color : cat.border,
               color: cat.color,
               boxShadow: isSelected ? `0 0 12px ${cat.color}55` : undefined
             }}>
          {cat.icon}
        </div>
        
        {/* Floating text to the right */}
        <div className="flex flex-col min-w-[80px] max-w-[170px] select-none text-left">
          <span className="text-[11px] font-bold text-white leading-tight truncate">{title}</span>
          <span className="text-[8.5px] font-medium text-slate-400 mt-0.5 leading-none truncate">{subtitle}</span>
        </div>
        
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  // Circular with inner text (Conditions, Procedures, Reports)
  let title = label;
  let subtitle = "";
  if (type === "surgery" && label.includes(" (")) {
    const idx = label.indexOf(" (");
    title = label.substring(0, idx);
    subtitle = label.substring(idx + 2, label.length - 1);
  } else if (type === "report" && label.includes(" ")) {
    const idx = label.lastIndexOf(" ");
    title = label.substring(0, idx);
    subtitle = label.substring(idx + 1);
  }

  return (
    <div className={`w-20 h-20 rounded-full border-2 bg-slate-950/90 hover:bg-[#070c1e] flex flex-col items-center justify-center p-2 text-center transition-all duration-300 ${isSelected ? 'scale-105' : ''}`}
         style={{
           borderColor: isSelected ? cat.color : cat.border,
           opacity: isDimmed ? 0.3 : 1,
           boxShadow: isSelected ? `0 0 15px ${cat.color}44` : undefined
         }}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <span className="text-[9.5px] font-black text-white leading-tight select-none truncate max-w-full">
        {title}
      </span>
      {subtitle && (
        <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-none select-none truncate max-w-full">
          {subtitle}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

/* ─────── Wrapper with Provider ─────── */
export default function DoctorGraphPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ReactFlowProvider>
      <DoctorGraphPageContent params={params} />
    </ReactFlowProvider>
  );
}

/* ─────── Main Page Content ─────── */
function DoctorGraphPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const patientId = Number(id);
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    conditions: false,
    medications: false,
    labs: false,
    procedures: false,
    reports: false,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState<any>([]);

  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  /* ── fetch ── */
  const fetchGraphData = useCallback(async () => {
    try {
      const [pRes, gRes] = await Promise.all([
        fetch(`${API}/patients/${patientId}`),
        fetch(`${API}/patients/${patientId}/graph`),
      ]);
      if (pRes.ok) setPatient(await pRes.json());
      if (gRes.ok) {
        const g = await gRes.json();
        const normalizedNodes = g.nodes.map((node: RawNode) => ({
          ...node,
          type: normalizeNodeType(node, g.edges)
        }));
        setRawNodes(normalizedNodes);
        setRawEdges(g.edges);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  /* ── derived: group by type ── */
  const grouped = useMemo(() => {
    const m: Record<string, RawNode[]> = {};
    rawNodes.forEach(n => { (m[n.type] ||= []).push(n); });
    return m;
  }, [rawNodes]);

  const patientNode = (grouped["patient"] || [])[0];

  /* ── positioned nodes ── */
  const positioned = useMemo(() => {
    if (!patientNode) return [];
    
    const result: any[] = [];
    
    // Patient at center
    const X_C = 650;
    const Y_C = 300;
    
    result.push({
      id: patientNode.id,
      type: "custom",
      position: { x: X_C - 32, y: Y_C - 32 }, // offset by half card size (32px) to center it
      data: { ...patientNode, isPatient: true },
    });

    const otherNodes = rawNodes.filter(n => n.id !== patientNode.id);

    // Group other nodes by category
    const conditions = otherNodes.filter(n => n.type === "disease");
    const medications = otherNodes.filter(n => n.type === "medication" || n.type === "allergy");
    const procedures = otherNodes.filter(n => n.type === "surgery");
    const reports = otherNodes.filter(n => n.type === "report");
    const labs = otherNodes.filter(n => n.type === "concept" || n.type === "doctor" || n.type === "hospital" || n.type === "timeline_event");

    const LIMIT = 3;

    // Helper to add group header
    const addHeader = (id: string, label: string, x: number, y: number, type: string) => {
      result.push({
        id: `header-${id}`,
        type: "custom",
        position: { x: x - 50, y: y - 12 }, // offset header box size (100x24) to center it
        data: { label, isHeader: true, type },
      });
    };

    // Helper to add +X more node
    const addMore = (id: string, count: number, x: number, y: number, type: string) => {
      result.push({
        id: `more-${id}`,
        type: "custom",
        position: { x: x - 20, y: y - 20 }, // offset more circle size (40x40) to center it
        data: { label: `+${count}`, isMore: true, type },
      });
    };

    // Helper to add - Less node
    const addLess = (id: string, x: number, y: number, type: string) => {
      result.push({
        id: `less-${id}`,
        type: "custom",
        position: { x: x - 20, y: y - 20 }, // offset Less circle size (40x40) to center it
        data: { label: "- Less", isLess: true, type },
      });
    };

    // 1. TOP SPOKE: Conditions (Up to 3 nodes)
    const isConditionsExpanded = expandedCategories.conditions;
    if (conditions.length > 0) {
      addHeader("conditions", "Conditions", X_C, Y_C - 230, "disease");
      if (!isConditionsExpanded) {
        const visible = conditions.slice(0, LIMIT);
        const N = visible.length;
        visible.forEach((node, i) => {
          let x = X_C;
          let y = Y_C - 150;
          if (N === 2) {
            x = X_C - 70 + i * 140;
            y = Y_C - 140;
          } else if (N === 3) {
            if (i === 0) { x = X_C - 120; y = Y_C - 130; }
            else if (i === 1) { x = X_C; y = Y_C - 170; }
            else if (i === 2) { x = X_C + 120; y = Y_C - 130; }
          }
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: y - 40 }, // offset by half card size (40px)
            data: { ...node },
          });
        });
        if (conditions.length > LIMIT) {
          addMore("conditions", conditions.length - LIMIT, X_C + 180, Y_C - 90, "disease");
        }
      } else {
        // Expanded: Grid layout
        const visible = conditions;
        visible.forEach((node, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const N_row = Math.min(visible.length + 1 - row * 4, 4);
          const startX = X_C - ((N_row - 1) / 2) * 120;
          const x = startX + col * 120;
          const y = Y_C - 140 - row * 75;
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: y - 40 },
            data: { ...node },
          });
        });
        // Less node
        const idx = visible.length;
        const row = Math.floor(idx / 4);
        const col = idx % 4;
        const N_row = Math.min(visible.length + 1 - row * 4, 4);
        const startX = X_C - ((N_row - 1) / 2) * 120;
        const x = startX + col * 120;
        const y = Y_C - 140 - row * 75;
        addLess("conditions", x, y, "disease");
      }
    }

    // 2. LEFT SPOKE: Medications (Up to 3 nodes, vertical list)
    const isMedsExpanded = expandedCategories.medications;
    if (medications.length > 0) {
      addHeader("medications", "Medications", X_C - 270, Y_C - 150, "medication");
      if (!isMedsExpanded) {
        const visible = medications.slice(0, LIMIT);
        visible.forEach((node, i) => {
          result.push({
            id: node.id,
            type: "custom",
            position: { x: X_C - 290, y: Y_C - 115 + i * 60 }, // aligns circles centered at X_C-270
            data: { ...node },
          });
        });
        if (medications.length > LIMIT) {
          addMore("medications", medications.length - LIMIT, X_C - 270, Y_C - 95 + LIMIT * 60, "medication");
        }
      } else {
        // Expanded: Multi-column vertical
        const visible = medications;
        visible.forEach((node, i) => {
          const col = Math.floor(i / 5);
          const row = i % 5;
          const x = X_C - 290 - col * 120;
          const y = Y_C - 115 + row * 60;
          result.push({
            id: node.id,
            type: "custom",
            position: { x, y },
            data: { ...node },
          });
        });
        // Less node
        const idx = visible.length;
        const col = Math.floor(idx / 5);
        const row = idx % 5;
        const x = X_C - 270 - col * 120;
        const y = Y_C - 95 + row * 60;
        addLess("medications", x, y, "medication");
      }
    }

    // 3. RIGHT SPOKE: Lab Results (Up to 3 nodes, vertical list)
    const isLabsExpanded = expandedCategories.labs;
    if (labs.length > 0) {
      addHeader("labs", "Lab Results", X_C + 270, Y_C - 150, "concept");
      if (!isLabsExpanded) {
        const visible = labs.slice(0, LIMIT);
        visible.forEach((node, i) => {
          result.push({
            id: node.id,
            type: "custom",
            position: { x: X_C + 250, y: Y_C - 115 + i * 60 }, // aligns circles centered at X_C+270
            data: { ...node },
          });
        });
        if (labs.length > LIMIT) {
          addMore("labs", labs.length - LIMIT, X_C + 270, Y_C - 95 + LIMIT * 60, "concept");
        }
      } else {
        // Expanded: Multi-column vertical
        const visible = labs;
        visible.forEach((node, i) => {
          const col = Math.floor(i / 5);
          const row = i % 5;
          const x = X_C + 250 + col * 120;
          const y = Y_C - 115 + row * 60;
          result.push({
            id: node.id,
            type: "custom",
            position: { x, y },
            data: { ...node },
          });
        });
        // Less node
        const idx = visible.length;
        const col = Math.floor(idx / 5);
        const row = idx % 5;
        const x = X_C + 270 + col * 120;
        const y = Y_C - 95 + row * 60;
        addLess("labs", x, y, "concept");
      }
    }

    // 4. BOTTOM LEFT SPOKE: Procedures (Up to 2 nodes, horizontal)
    const isProceduresExpanded = expandedCategories.procedures;
    if (procedures.length > 0) {
      addHeader("procedures", "Procedures", X_C - 130, Y_C + 110, "surgery");
      if (!isProceduresExpanded) {
        const visible = procedures.slice(0, 2);
        const N = visible.length;
        visible.forEach((node, i) => {
          let x = X_C - 130;
          if (N === 2) {
            x = X_C - 190 + i * 120;
          }
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: Y_C + 175 - 40 },
            data: { ...node },
          });
        });
        if (procedures.length > 2) {
          addMore("procedures", procedures.length - 2, X_C - 130 + 100, Y_C + 245, "surgery");
        }
      } else {
        // Expanded: Grid layout downwards
        const visible = procedures;
        visible.forEach((node, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const N_row = Math.min(visible.length + 1 - row * 3, 3);
          const startX = X_C - 130 - ((N_row - 1) / 2) * 110;
          const x = startX + col * 110;
          const y = Y_C + 175 + row * 75;
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: y - 40 },
            data: { ...node },
          });
        });
        // Less node
        const idx = visible.length;
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const N_row = Math.min(visible.length + 1 - row * 3, 3);
        const startX = X_C - 130 - ((N_row - 1) / 2) * 110;
        const x = startX + col * 110;
        const y = Y_C + 175 + row * 75;
        addLess("procedures", x, y, "surgery");
      }
    }

    // 5. BOTTOM RIGHT SPOKE: Reports (Up to 2 nodes, horizontal)
    const isReportsExpanded = expandedCategories.reports;
    if (reports.length > 0) {
      addHeader("reports", "Reports", X_C + 130, Y_C + 110, "report");
      if (!isReportsExpanded) {
        const visible = reports.slice(0, 2);
        const N = visible.length;
        visible.forEach((node, i) => {
          let x = X_C + 130;
          if (N === 2) {
            x = X_C + 70 + i * 120;
          }
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: Y_C + 175 - 40 },
            data: { ...node },
          });
        });
        if (reports.length > 2) {
          addMore("reports", reports.length - 2, X_C + 130 + 100, Y_C + 245, "report");
        }
      } else {
        // Expanded: Grid layout downwards
        const visible = reports;
        visible.forEach((node, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const N_row = Math.min(visible.length + 1 - row * 3, 3);
          const startX = X_C + 130 - ((N_row - 1) / 2) * 110;
          const x = startX + col * 110;
          const y = Y_C + 175 + row * 75;
          result.push({
            id: node.id,
            type: "custom",
            position: { x: x - 40, y: y - 40 },
            data: { ...node },
          });
        });
        // Less node
        const idx = visible.length;
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const N_row = Math.min(visible.length + 1 - row * 3, 3);
        const startX = X_C + 130 - ((N_row - 1) / 2) * 110;
        const x = startX + col * 110;
        const y = Y_C + 175 + row * 75;
        addLess("reports", x, y, "report");
      }
    }

    return result;
  }, [rawNodes, patientNode, expandedCategories]);

  const neighbors = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    rawEdges.forEach(e => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, rawEdges]);

  const visibleNodeIds = useMemo(() => {
    return new Set(positioned.map(n => n.id));
  }, [positioned]);

  /* ── dynamic edges mapping ── */
  const flowEdges = useMemo(() => {
    const resultEdges: any[] = [];
    
    // Add edges to the standard nodes
    const activeEdges = rawEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    activeEdges.forEach((e, idx) => {
      const isSelected = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
      const isDimmed = selectedNodeId !== null && !isSelected;
      
      const isPatientEdge = e.source === patientNode?.id || e.target === patientNode?.id;
      const isVisible = showAllEdges || isPatientEdge;
      
      const targetNode = rawNodes.find(n => n.id === (e.source === selectedNodeId ? e.target : e.source));
      const targetCat = catOf(targetNode?.type || "");
      
      resultEdges.push({
        id: `edge-${idx}`,
        source: e.source,
        target: e.target,
        label: isPatientEdge ? e.label.toLowerCase().replace(/_/g, " ") : "",
        animated: !!isSelected,
        hidden: !isVisible,
        style: {
          stroke: isSelected ? targetCat.color : "#334155",
          strokeWidth: isSelected ? 2.5 : 1.2,
          opacity: isSelected ? 1 : isDimmed ? 0.08 : 0.45,
          transition: "stroke-width 0.2s, opacity 0.2s, stroke 0.2s",
        },
        labelStyle: {
          fill: isSelected ? "#e2e8f0" : isDimmed ? "rgba(148,163,184,0.1)" : "#94a3b8",
          fontSize: "8px",
          fontWeight: "600",
        },
      });
    });

    // Group nodes for more placeholders calculations
    const otherNodes = rawNodes.filter(n => n.id !== patientNode?.id);
    const conditions = otherNodes.filter(n => n.type === "disease");
    const medications = otherNodes.filter(n => n.type === "medication" || n.type === "allergy");
    const procedures = otherNodes.filter(n => n.type === "surgery");
    const reports = otherNodes.filter(n => n.type === "report");
    const labs = otherNodes.filter(n => n.type === "concept" || n.type === "doctor" || n.type === "hospital" || n.type === "timeline_event");

    const LIMIT = 3;
    const isConditionsExpanded = expandedCategories.conditions;
    const isMedsExpanded = expandedCategories.medications;
    const isLabsExpanded = expandedCategories.labs;
    const isProceduresExpanded = expandedCategories.procedures;
    const isReportsExpanded = expandedCategories.reports;

    // Add dashed edges to the "more" placeholder nodes or collapse connection for "less" nodes
    if (patientNode) {
      if (medications.length > LIMIT) {
        if (!isMedsExpanded) {
          resultEdges.push({
            id: "edge-more-meds",
            source: patientNode.id,
            target: "more-medications",
            label: "prescribed",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        } else {
          resultEdges.push({
            id: "edge-less-meds",
            source: patientNode.id,
            target: "less-medications",
            label: "collapse",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        }
      }

      if (labs.length > LIMIT) {
        if (!isLabsExpanded) {
          resultEdges.push({
            id: "edge-more-labs",
            source: patientNode.id,
            target: "more-labs",
            label: "has result",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        } else {
          resultEdges.push({
            id: "edge-less-labs",
            source: patientNode.id,
            target: "less-labs",
            label: "collapse",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        }
      }

      if (conditions.length > LIMIT) {
        if (!isConditionsExpanded) {
          resultEdges.push({
            id: "edge-more-conditions",
            source: patientNode.id,
            target: "more-conditions",
            label: "diagnosed with",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        } else {
          resultEdges.push({
            id: "edge-less-conditions",
            source: patientNode.id,
            target: "less-conditions",
            label: "collapse",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        }
      }

      if (procedures.length > 2) {
        if (!isProceduresExpanded) {
          resultEdges.push({
            id: "edge-more-procedures",
            source: patientNode.id,
            target: "more-procedures",
            label: "underwent",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        } else {
          resultEdges.push({
            id: "edge-less-procedures",
            source: patientNode.id,
            target: "less-procedures",
            label: "collapse",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        }
      }

      if (reports.length > 2) {
        if (!isReportsExpanded) {
          resultEdges.push({
            id: "edge-more-reports",
            source: patientNode.id,
            target: "more-reports",
            label: "recorded in",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        } else {
          resultEdges.push({
            id: "edge-less-reports",
            source: patientNode.id,
            target: "less-reports",
            label: "collapse",
            animated: false,
            style: { stroke: "#475569", strokeDasharray: "4 4", strokeWidth: 1.5, opacity: selectedNodeId ? 0.08 : 0.45 },
            labelStyle: { fill: "#64748b", fontSize: 8, fontWeight: 700 }
          });
        }
      }
    }

    return resultEdges;
  }, [rawEdges, visibleNodeIds, showAllEdges, selectedNodeId, patientNode, rawNodes, expandedCategories]);

  /* ── Sync positions and states into React Flow nodes/edges ── */
  useEffect(() => {
    if (positioned.length > 0) {
      setNodes(positioned.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSelected: selectedNodeId === n.id,
          isDimmed: selectedNodeId !== null && selectedNodeId !== n.id && !neighbors.has(n.id),
          isNeighbor: selectedNodeId !== null && neighbors.has(n.id) && selectedNodeId !== n.id,
        }
      })));
    }
  }, [positioned, selectedNodeId, neighbors, setNodes]);

  useEffect(() => {
    setEdgesState(flowEdges);
  }, [flowEdges, setEdgesState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMaximized) {
        setIsMaximized(false);
        setTimeout(() => {
          fitView({ padding: 0.2, minZoom: 0.7, duration: 400 });
        }, 150);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized, fitView]);

  /* ── Auto fit view on load & handle highlight query param ── */
  useEffect(() => {
    if (positioned.length > 0) {
      let highlighted = false;
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search);
        const highlight = searchParams.get("highlight");
        if (highlight) {
          const match = positioned.find(n => n.data.label.toLowerCase() === highlight.toLowerCase());
          if (match) {
            setSelectedNodeId(match.id);
            highlighted = true;
            setTimeout(() => {
              setCenter(match.position.x + 50, match.position.y + 20, { zoom: 1.15, duration: 400 });
            }, 300);
          }
        }
      }
      
      if (!highlighted) {
        setTimeout(() => {
          fitView({ padding: 0.25, minZoom: 0.7, duration: 500 });
        }, 150);
      }
    }
  }, [positioned, fitView, setCenter]);

  /* ── Selection interaction handlers ── */
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    if (node.id.startsWith("more-")) {
      const cat = node.id.replace("more-", "");
      setExpandedCategories(prev => ({ ...prev, [cat]: true }));
      setTimeout(() => {
        fitView({ padding: 0.25, minZoom: 0.7, duration: 450 });
      }, 150);
      return;
    }
    if (node.id.startsWith("less-")) {
      const cat = node.id.replace("less-", "");
      setExpandedCategories(prev => ({ ...prev, [cat]: false }));
      setTimeout(() => {
        fitView({ padding: 0.25, minZoom: 0.7, duration: 450 });
      }, 150);
      return;
    }

    setSelectedNodeId(node.id);
    // Smoothly center viewport on selected node
    setCenter(node.position.x + 50, node.position.y + 20, { zoom: 1.15, duration: 400 });
  }, [setCenter, fitView]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectAndCenterNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const node = nodes.find((n: any) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 50, node.position.y + 20, { zoom: 1.15, duration: 400 });
    }
  }, [nodes, setCenter]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchGraphData();
    setTimeout(() => {
      fitView({ padding: 0.2, minZoom: 0.7, duration: 400 });
    }, 100);
  };

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFit = () => fitView({ padding: 0.2, minZoom: 0.7, duration: 450 });
  const handleToggleMaximize = () => {
    setIsMaximized(prev => !prev);
    setTimeout(() => {
      fitView({ padding: 0.2, minZoom: 0.7, duration: 400 });
    }, 150);
  };
  const handleReset = () => {
    setSelectedNodeId(null);
    fitView({ padding: 0.2, minZoom: 0.7, duration: 450 });
  };

  /* ── Sidebar data ── */
  const conditions  = grouped["disease"]    || [];
  const medications = grouped["medication"] || [];
  const procedures  = grouped["surgery"]    || [];
  const reports     = grouped["report"]     || [];

  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId)?.data || null;

  const nodeEdges = (nodeId: string) => rawEdges.filter(e => e.source === nodeId || e.target === nodeId);

  /* ───────── RENDER ───────── */
  return (
    <div 
      className={`flex flex-col overflow-hidden ${
        isMaximized 
          ? "fixed inset-0 z-50 bg-[#060b18] w-screen h-screen" 
          : "flex-1 min-h-0"
      }`} 
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      {/* ── patient stats bar ── */}
      {patient && !isMaximized && (
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
              { n: conditions.length,  label: "Conditions",  color: "#22d3ee" },
              { n: medications.length, label: "Medications", color: "#facc15" },
              { n: reports.length,     label: "Reports",     color: "#f97316" },
              { n: procedures.length,  label: "Procedures",  color: "#34d399" },
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



        {/* ── CENTER GRAPH ── */}
        <div className="flex-1 flex flex-col bg-[#060b18] relative overflow-hidden">
          {/* graph toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/40">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Health Knowledge Graph
                <span className="text-[9px] text-slate-500 font-normal ml-1">Interactive explorer. Drag nodes or select to highlight connections.</span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {/* show all toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <span className="text-[10px] text-slate-400 font-medium">All edges</span>
                <button onClick={() => setShowAllEdges(!showAllEdges)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative ${showAllEdges ? "bg-indigo-500" : "bg-slate-700"}`}>
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${showAllEdges ? "left-[17px]" : "left-0.5"}`} />
                </button>
              </label>
              <button onClick={() => setShowLegend(!showLegend)}
                className="text-[10px] text-slate-400 border border-slate-700 rounded-lg px-2.5 py-1 hover:bg-slate-800/60 transition font-medium">
                Legend
              </button>
              <button onClick={handleRefresh} disabled={loading}
                className="text-slate-400 hover:text-white p-1 transition">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* React Flow canvas */}
          <div className="flex-1 relative w-full h-full">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-[#060b18]">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400 italic">Building health knowledge graph…</p>
              </div>
            ) : (
              <div className="w-full h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  minZoom={0.15}
                  maxZoom={2.5}
                >
                  <Background color="#64748b" style={{ opacity: 0.1 }} gap={28} size={1.2} />
                </ReactFlow>
              </div>
            )}

            {/* zoom controls */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-[#0d1530]/90 border border-slate-800/60 rounded-xl px-1.5 py-1 backdrop-blur-sm z-10">
              {[
                { icon: <ZoomIn className="w-3.5 h-3.5" />,      fn: handleZoomIn },
                { icon: <ZoomOut className="w-3.5 h-3.5" />,     fn: handleZoomOut },
                { icon: isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />,   fn: handleToggleMaximize },
                { icon: <RotateCcw className="w-3.5 h-3.5" />,   fn: handleReset },
              ].map((b, i) => (
                <button key={i} onClick={b.fn}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition">
                  {b.icon}
                </button>
              ))}
            </div>

            {/* legend popup */}
            {showLegend && (
              <div className="absolute top-3 right-3 bg-[#0d1530]/95 border border-slate-800/60 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-2 shadow-2xl z-10 min-w-[160px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Legend</span>
                  <button onClick={() => setShowLegend(false)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
                </div>
                {Object.entries(CAT).filter(([k]) => k !== "patient").map(([key, cat]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 shrink-0" style={{ borderColor: cat.color, background: cat.bg }} />
                    <span className="text-[11px] text-slate-300 font-medium">{cat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT INSPECTOR ── */}
        <aside className={`border-l border-slate-800/50 bg-[#080e20]/60 overflow-y-auto transition-all duration-300 flex flex-col ${selectedNode && !isMaximized ? "w-[290px] min-w-[290px]" : "w-0 min-w-0"}`}>
          {selectedNode && (
            <div className="p-5 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200">
              {/* close */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{selectedNode.label}</h3>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-white transition"><X className="w-4 h-4" /></button>
              </div>

              {/* type badge */}
              <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{ color: catOf(selectedNode.type).color, borderColor: catOf(selectedNode.type).border, background: catOf(selectedNode.type).bg }}>
                {catOf(selectedNode.type).label}
              </span>

              {/* description */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-[12px] text-slate-300 leading-relaxed">{selectedNode.description}</p>
              </div>

              {/* connections */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Connected To</p>
                <div className="flex flex-col gap-1.5">
                  {nodeEdges(selectedNode.id).map((edge, i) => {
                    const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const otherNode = rawNodes.find(n => n.id === otherId);
                    if (!otherNode) return null;
                    const otherCat = catOf(otherNode.type);
                    return (
                      <button key={i} onClick={() => selectAndCenterNode(otherId)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800/40 hover:border-slate-700 transition text-left group">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: otherCat.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-200 font-medium truncate group-hover:text-white transition">{otherNode.label}</p>
                          <p className="text-[9px] text-slate-500">{edge.label.toLowerCase().replace(/_/g, " ")}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* view full details button */}
              <button 
                onClick={() => {
                  if (selectedNode.type === "report") {
                    router.push(`/patient/${patientId}/timeline?doc=${encodeURIComponent(selectedNode.label)}`);
                  } else {
                    router.push(`/patient/${patientId}/timeline?term=${encodeURIComponent(selectedNode.label)}`);
                  }
                }}
                className="mt-2 w-full py-2.5 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" /> View full details
              </button>
            </div>
          )}
        </aside>
      </main>

      <style jsx global>{`
        .react-flow__node {
          cursor: grab;
        }
        .react-flow__node:active {
          cursor: grabbing;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.7), 0 0 30px rgba(139, 92, 246, 0.4); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}

/* ── SidebarCard component ── */
function SidebarCard({ title, count, accent, children }: { title: string; count: number; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800/50 bg-[#0a1025]/60 overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/30">
        <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{title}</h4>
        <span className="text-[10px] font-semibold" style={{ color: accent }}>{count}</span>
      </div>
      <div className="px-1.5 py-1.5 flex flex-col gap-0.5 max-h-[160px] overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
