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

/* ── Custom Node Component ── */
const CustomNode = ({ data }: { data: any }) => {
  const { label, type, isPatient, isSelected, isDimmed } = data;
  const cat = catOf(type);
  
  if (isPatient) {
    return (
      <div className={`reactflow-node-patient w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 bg-[#090e20] transition-all duration-300 relative ${isSelected ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.6)] scale-110' : 'border-violet-500/50'} ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
           style={{ animation: isSelected ? "pulse-glow 2s infinite" : undefined }}>
        <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
        <span className="text-white text-base font-black">{initials(label)}</span>
        <span className="absolute top-18 text-xs font-bold text-slate-200 whitespace-nowrap bg-slate-950/90 px-2 py-0.5 rounded-md border border-slate-800 shadow-xl">
          {label}
        </span>
        <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
      </div>
    );
  }

  return (
    <div className={`reactflow-node-concept px-3.5 py-2 rounded-xl border flex items-center gap-2.5 bg-[#080d1f]/95 hover:bg-[#0a1129]/100 transition-all duration-300 ${isSelected ? 'scale-105 shadow-xl border-opacity-100' : 'border-opacity-50'}`}
         style={{
           borderColor: isSelected ? cat.color : cat.border,
           opacity: isDimmed ? 0.3 : 1,
           boxShadow: isSelected ? `0 0 15px ${cat.color}44` : undefined,
         }}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      <div className="p-1.5 rounded-lg shrink-0" style={{ background: cat.bg, color: cat.color }}>
        {cat.icon}
      </div>
      <div className="flex flex-col min-w-[85px] max-w-[155px]">
        <span className="text-[11px] font-bold text-slate-100 truncate leading-tight">{label}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: cat.color }}>
          {cat.label}
        </span>
      </div>
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

  const [patient, setPatient] = useState<Patient | null>(null);
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

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
        setRawNodes(g.nodes);
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
    
    // Patient at center (450, 300)
    result.push({
      id: patientNode.id,
      type: "custom",
      position: { x: 450, y: 300 },
      data: { ...patientNode, isPatient: true },
    });

    const otherNodes = rawNodes.filter(n => n.id !== patientNode.id);
    const categories = Array.from(new Set(otherNodes.map(n => n.type)));
    
    categories.forEach((cat, catIdx) => {
      const catNodes = otherNodes.filter(n => n.type === cat);
      const N = catNodes.length;
      
      let baseAngle = (catIdx * (2 * Math.PI)) / Math.max(categories.length, 1);
      
      // Fine-tuned quadrant mappings for beautiful layout
      if (cat === "disease") baseAngle = -Math.PI / 2; // conditions -> Top
      else if (cat === "medication") baseAngle = -Math.PI; // medications -> Left
      else if (cat === "report") baseAngle = Math.PI / 4; // reports -> Bottom-Right
      else if (cat === "surgery") baseAngle = (3 * Math.PI) / 4; // surgeries -> Bottom-Left
      else if (cat === "allergy") baseAngle = -Math.PI / 4; // allergies -> Top-Right
      else if (cat === "doctor") baseAngle = -Math.PI / 8; // doctors -> Right
      else if (cat === "hospital") baseAngle = Math.PI / 16; // hospitals -> Right-Bottom
      
      const angleSpread = N > 1 ? Math.min(Math.PI / 2.5, (N - 1) * 0.28) : 0;
      
      catNodes.forEach((node, i) => {
        let angle = baseAngle;
        if (N > 1) {
          angle = baseAngle - angleSpread / 2 + (i * angleSpread) / (N - 1);
        }
        
        // Stagger radii to minimize overlap
        const radius = 230 + (i % 2) * 90;
        
        const x = 450 + radius * Math.cos(angle) - 75; // center offset correction
        const y = 300 + radius * Math.sin(angle) - 25;
        
        result.push({
          id: node.id,
          type: "custom",
          position: { x, y },
          data: { ...node, isPatient: false },
        });
      });
    });

    return result;
  }, [rawNodes, patientNode]);

  const neighbors = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    rawEdges.forEach(e => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, rawEdges]);

  /* ── dynamic edges mapping ── */
  const flowEdges = useMemo(() => {
    return rawEdges.map((e, idx) => {
      const isSelected = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
      const isDimmed = selectedNodeId !== null && !isSelected;
      
      const isPatientEdge = e.source === patientNode?.id || e.target === patientNode?.id;
      const isVisible = showAllEdges || isPatientEdge;
      
      const targetNode = rawNodes.find(n => n.id === (e.source === selectedNodeId ? e.target : e.source));
      const targetCat = catOf(targetNode?.type || "");
      
      return {
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
      };
    });
  }, [rawEdges, selectedNodeId, showAllEdges, patientNode, rawNodes]);

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
          fitView({ padding: 0.15, duration: 500 });
        }, 150);
      }
    }
  }, [positioned, fitView, setCenter]);

  /* ── Selection interaction handlers ── */
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    // Smoothly center viewport on selected node
    setCenter(node.position.x + 50, node.position.y + 20, { zoom: 1.15, duration: 400 });
  }, [setCenter]);

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
      fitView({ padding: 0.15, duration: 400 });
    }, 100);
  };

  const handleZoomIn = () => zoomIn({ duration: 300 });
  const handleZoomOut = () => zoomOut({ duration: 300 });
  const handleFit = () => fitView({ padding: 0.15, duration: 450 });
  const handleToggleMaximize = () => {
    setIsMaximized(prev => !prev);
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 150);
  };
  const handleReset = () => {
    setSelectedNodeId(null);
    fitView({ padding: 0.15, duration: 450 });
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
    <div className="min-h-screen bg-[#060b18] text-slate-100 flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!isMaximized && <Header currentPatientId={patientId} activePortal="doctor" activeTab="graph" />}

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

        {/* ── LEFT SIDEBAR ── */}
        {!isMaximized && (
          <aside className="w-[260px] min-w-[260px] border-r border-slate-800/50 bg-[#080e20]/60 overflow-y-auto px-4 py-5 flex flex-col gap-4 scrollbar-thin">

          {/* Active Conditions */}
          <SidebarCard title="Active Conditions" count={conditions.length} accent="#22d3ee">
            {conditions.map(c => (
              <button key={c.id} onClick={() => selectAndCenterNode(c.id)}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/5 transition group">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="text-[12px] text-slate-200 group-hover:text-cyan-300 transition truncate">{c.label}</span>
              </button>
            ))}
          </SidebarCard>

          {/* Current Medications */}
          <SidebarCard title="Current Medications" count={medications.length} accent="#facc15">
            {medications.map(m => (
              <button key={m.id} onClick={() => selectAndCenterNode(m.id)}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/5 transition group">
                <Pill className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[12px] text-slate-200 group-hover:text-amber-300 transition truncate">{m.label}</span>
              </button>
            ))}
          </SidebarCard>

          {/* Procedures */}
          <SidebarCard title="Procedures" count={procedures.length} accent="#34d399">
            {procedures.map(s => (
              <button key={s.id} onClick={() => selectAndCenterNode(s.id)}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/5 transition group">
                <Stethoscope className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[12px] text-slate-200 group-hover:text-emerald-300 transition truncate">{s.label}</span>
              </button>
            ))}
          </SidebarCard>

          {/* Reports */}
          <SidebarCard title="Reports" count={reports.length} accent="#f97316">
            {reports.map(r => (
              <button key={r.id} onClick={() => selectAndCenterNode(r.id)}
                className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-orange-500/5 transition group">
                <FileText className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="text-[12px] text-slate-200 group-hover:text-orange-300 transition truncate">{r.label}</span>
              </button>
            ))}
          </SidebarCard>

          {/* Connections summary */}
          <div className="mt-auto pt-3 border-t border-slate-800/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Nodes: {rawNodes.length}</span>
              <span>Connections: {rawEdges.length}</span>
            </div>
          </div>
        </aside>
      )}

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
              <button className="mt-2 w-full py-2.5 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5">
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
        .react-flow__attribution {
          display: none !important;
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
