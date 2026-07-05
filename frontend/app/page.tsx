"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  ArrowRight,
  ChevronRight,
  FileText,
  Network,
  Terminal,
  Users,
  Menu,
  X,
  Activity,
  Sparkles,
  Cpu,
  Clock,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon
} from "lucide-react";

export default function LandingPage() {
  // Mobile nav state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "dark";
    setTheme(saved);
    if (saved === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  // Live ticking stats state
  const [stats, setStats] = useState({
    patients: 1248,
    records: 42910,
    entities: 184302,
    connections: 542890,
  });

  // Increment stats slowly to represent "living memory"
  useEffect(() => {
    const timer = setInterval(() => {
      setStats((prev) => ({
        patients: prev.patients + (Math.random() > 0.85 ? 1 : 0),
        records: prev.records + (Math.random() > 0.6 ? 1 : 0),
        entities: prev.entities + Math.floor(Math.random() * 3),
        connections: prev.connections + Math.floor(Math.random() * 5),
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-500 ${
      isDark ? "bg-[#060b18] text-slate-100" : "bg-white text-zinc-900"
    }`}>
      
      {/* 1. Header Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md px-6 py-4 border-b transition-colors duration-500 ${
        isDark ? "bg-[#060b18]/80 border-slate-850" : "bg-white/80 border-zinc-200/80"
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/10 group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>MediMemory</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/25">Cognee Cloud</span>
              </div>
              <p className={`text-[10px] font-medium tracking-wide uppercase mt-0.5 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                Longitudinal Health Memory Graph
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className={`hidden md:flex items-center gap-8 text-sm font-semibold transition-colors duration-500 ${
            isDark ? "text-slate-300" : "text-zinc-600"
          }`}>
            <a href="#problem" className="hover:text-indigo-500 transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-indigo-500 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-indigo-500 transition-colors">Features</a>
            <a href="https://github.com/MidnightMaverick07/MediMemory" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-500 transition-colors">
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Header Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 border rounded-xl transition-all duration-300 ${
                isDark 
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white" 
                  : "bg-slate-50 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/patients"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg ${
                isDark 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10" 
                  : "bg-zinc-900 hover:bg-zinc-800 text-white shadow-zinc-900/10"
              }`}
            >
              Launch App
            </Link>
          </div>

          {/* Mobile Menu Button + Theme Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className={`p-2 border rounded-xl ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-zinc-200 text-zinc-600"
              }`}
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 transition-colors ${isDark ? "text-slate-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className={`md:hidden absolute top-full left-0 right-0 border-b px-6 py-6 flex flex-col gap-4 shadow-xl animate-fade-in ${
            isDark ? "bg-[#060b18] border-slate-850" : "bg-white border-zinc-200"
          }`}>
            <a
              href="#problem"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b transition-colors ${
                isDark ? "text-slate-300 hover:text-indigo-400 border-slate-900" : "text-zinc-700 hover:text-indigo-600 border-zinc-100"
              }`}
            >
              Problem
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b transition-colors ${
                isDark ? "text-slate-300 hover:text-indigo-400 border-slate-900" : "text-zinc-700 hover:text-indigo-600 border-zinc-100"
              }`}
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b transition-colors ${
                isDark ? "text-slate-300 hover:text-indigo-400 border-slate-900" : "text-zinc-700 hover:text-indigo-600 border-zinc-100"
              }`}
            >
              Features
            </a>
            <a
              href="https://github.com/MidnightMaverick07/MediMemory"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-semibold py-2 border-b transition-colors flex items-center gap-1 ${
                isDark ? "text-slate-300 hover:text-indigo-400 border-slate-900" : "text-zinc-700 hover:text-indigo-600 border-zinc-100"
              }`}
            >
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/patients"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 mt-2 block"
            >
              Launch App
            </Link>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className={`relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 border-b transition-colors duration-500 ${
        isDark ? "bg-[#060b18] border-slate-850" : "bg-gradient-to-b from-slate-50/50 to-white border-zinc-100"
      }`}>
        {/* Soft Background Glares */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-3xl pointer-events-none rounded-full transition-colors duration-500 ${
          isDark ? "bg-indigo-600/5" : "bg-indigo-100/30"
        }`} />
        <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] blur-3xl pointer-events-none rounded-full transition-colors duration-500 ${
          isDark ? "bg-violet-600/5 animate-pulse-slow" : "bg-violet-50/20"
        }`} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative px-6">
          
          {/* Left Text Area */}
          <div className="lg:col-span-7 flex flex-col items-start text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 font-bold mb-6 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              Longitudinal Memory Powered by Cognee
            </div>

            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 ${
              isDark ? "text-white" : "text-zinc-900"
            }`}>
              Give your family's health a memory.
            </h1>

            <p className={`text-lg md:text-xl leading-relaxed max-w-xl mb-10 transition-colors duration-500 ${
              isDark ? "text-slate-400" : "text-zinc-600"
            }`}>
              A longitudinal clinical memory graph that transforms fragmented medical records into a lifelong, connected knowledge network. Give doctors instant context instead of scattered PDFs.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto animation-delay-100 animate-fade-up">
              <Link
                href="/patients"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.02]"
              >
                Launch Live Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <a
                href="https://github.com/MidnightMaverick07/MediMemory"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-8 py-4 border rounded-2xl text-sm font-bold transition-all shadow-md ${
                  isDark 
                    ? "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200" 
                    : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700"
                }`}
              >
                View on GitHub
              </a>
            </div>

            {/* Works with tech strip */}
            <div className={`mt-12 w-full pt-8 border-t animation-delay-200 animate-fade-up ${isDark ? "border-slate-850" : "border-zinc-100"}`}>
              <p className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-4">Works with</p>
              <div className={`flex flex-wrap items-center gap-y-4 gap-x-8 font-semibold text-sm transition-colors duration-500 ${
                isDark ? "text-slate-400" : "text-zinc-500"
              }`}>
                <span className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                  <Brain className="w-4.5 h-4.5 text-indigo-500" /> Cognee Cloud
                </span>
                <span className="flex items-center gap-1.5 hover:text-orange-400 transition-colors">
                  <Cpu className="w-4.5 h-4.5 text-orange-500" /> Gemini Pro
                </span>
                <span className={`hover:text-indigo-400 transition-colors ${isDark ? "text-slate-300" : "text-zinc-900"}`}>
                  Next.js App Router
                </span>
                <span className={`hover:text-indigo-400 transition-colors ${isDark ? "text-slate-300" : "text-zinc-900"}`}>
                  FastAPI
                </span>
              </div>
            </div>
          </div>

          {/* Right Live Ticker Widget */}
          <div className="lg:col-span-5 w-full animate-float">
            <div className="bg-zinc-950 text-zinc-100 rounded-3xl p-8 border border-zinc-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />
              
              <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">MediMemory Engine Running</span>
                </div>
                <Terminal className="w-4 h-4 text-zinc-500" />
              </div>

              <p className="text-sm font-semibold text-zinc-300 mb-8 font-mono">
                $ cognee.get_memory_status()
              </p>

              <div className="flex flex-col gap-6">
                
                {/* Stat 1 */}
                <div className="flex justify-between items-end border-b border-zinc-900 pb-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Patients Registered</span>
                    <h3 className="text-2xl font-black font-mono text-white mt-1">
                      {stats.patients.toLocaleString()}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">+ Live</span>
                </div>

                {/* Stat 2 */}
                <div className="flex justify-between items-end border-b border-zinc-900 pb-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Unstructured Records Parsed</span>
                    <h3 className="text-2xl font-black font-mono text-white mt-1">
                      {stats.records.toLocaleString()}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-indigo-400">OCR Multi-Modal</span>
                </div>

                {/* Stat 3 */}
                <div className="flex justify-between items-end border-b border-zinc-900 pb-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Entities Extracted</span>
                    <h3 className="text-2xl font-black font-mono text-white mt-1">
                      {stats.entities.toLocaleString()}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-indigo-400">Clinical Entities</span>
                </div>

                {/* Stat 4 */}
                <div className="flex justify-between items-end pb-2">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Semantic Connections formed</span>
                    <h3 className="text-2xl font-black font-mono text-white mt-1">
                      {stats.connections.toLocaleString()}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">Graph Edges</span>
                </div>

              </div>

              <div className="mt-8 pt-4 border-t border-zinc-900 text-center">
                <span className="text-[10px] font-mono text-zinc-500">
                  Data reflects live mock clinical memory activity.
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Problem Section */}
      <section id="problem" className={`py-20 md:py-32 transition-colors duration-500 ${
        isDark ? "bg-[#080e20]/40 border-b border-slate-850" : "bg-white border-b border-zinc-100"
      } px-6`}>
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-3xl mb-16 md:mb-24 animate-fade-up">
            <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-500 mb-3">The Problem</p>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 ${
              isDark ? "text-white" : "text-zinc-900"
            }`}>
              Medical records are scattered. Traditional search fails to connect the dots.
            </h2>
            <p className={`text-lg leading-relaxed transition-colors duration-500 ${
              isDark ? "text-slate-350" : "text-zinc-600"
            }`}>
              When a patient manages complex conditions, their health history lives in pieces: paper prescriptions, hospital discharge summaries, and siloed portal PDFs. Doctors have minutes, not hours, to reconstruct the timeline. Standard vector RAG retrieves matching snippets, but it cannot connect a symptom from two years ago to a medication change last month. <strong>Health history is a timeline of cause and effect. It must be represented as a graph.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-up animation-delay-100">
            
            {/* Card 1 */}
            <div className={`border rounded-3xl p-8 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-slate-50/50 border-zinc-200/80"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Chronic Disease Tracking</h3>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                Connect and graph symptoms, lab values, and treatments over decades to identify progressive health trends.
              </p>
            </div>

            {/* Card 2 */}
            <div className={`border rounded-3xl p-8 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-slate-50/50 border-zinc-200/80"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Users className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Multi-Doctor Continuity</h3>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                Bridge care between specialists. Ensure every provider knows why a medication was stopped or adjusted.
              </p>
            </div>

            {/* Card 3 */}
            <div className={`border rounded-3xl p-8 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-slate-50/50 border-zinc-200/80"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Family Health History</h3>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                Log and preserve family clinical profiles in a structured, long-term format that helps spot genetic risks.
              </p>
            </div>

            {/* Card 4 */}
            <div className={`border rounded-3xl p-8 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-slate-50/50 border-zinc-200/80"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Preventive Care Signals</h3>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                Spot subtle, multi-year drift in clinical values (such as HbA1c or eGFR) before they cross pathological thresholds.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className={`py-20 md:py-32 transition-colors duration-500 ${
        isDark ? "bg-[#060b18] border-b border-slate-850" : "bg-slate-50 border-b border-zinc-100"
      } px-6`}>
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 animate-fade-up">
            <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-500 mb-3">The Mechanism</p>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 ${
              isDark ? "text-white" : "text-zinc-900"
            }`}>
              How it works: Ingestion to Semantic Influx
            </h2>
            <p className={`text-lg transition-colors duration-500 ${isDark ? "text-slate-400" : "text-zinc-650"}`}>
              MediMemory processes raw medical documents and builds a connected knowledge graph using Cognee Cloud. Here is the operational flow:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-up animation-delay-100">
            
            {/* Step 1 */}
            <div className={`flex flex-col h-full justify-between border rounded-3xl p-6 shadow-sm ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-white border-zinc-200"
            }`}>
              <div>
                <span className={`text-5xl font-black block mb-6 ${isDark ? "text-slate-800/40" : "text-zinc-200/60"}`}>01</span>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Upload Records</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                  Upload scans, PDFs, or photos of prescriptions. Multimodal vision OCR automatically digitizes text.
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 border border-zinc-800">
                <span className="text-zinc-600"># Ingest report file</span>
                <div className="mt-1.5 text-zinc-200 overflow-x-auto whitespace-pre">
                  {"curl -X POST /reports/upload \\\n  -F \"file=@lab_report.pdf\""}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex flex-col h-full justify-between border rounded-3xl p-6 shadow-sm ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-white border-zinc-200"
            }`}>
              <div>
                <span className={`text-5xl font-black block mb-6 ${isDark ? "text-slate-800/40" : "text-zinc-200/60"}`}>02</span>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Extract Entities</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                  Gemini parses text, extracting clinical metadata, dosages, timelines, allergies, and physicians.
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 border border-zinc-800">
                <span className="text-zinc-600"># Clinical entities</span>
                <div className="mt-1.5 text-zinc-200 overflow-x-auto whitespace-pre">
                  {"{\n  \"condition\": \"Diabetes\",\n  \"med\": \"Metformin\"\n}"}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`flex flex-col h-full justify-between border rounded-3xl p-6 shadow-sm ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-white border-zinc-200"
            }`}>
              <div>
                <span className={`text-5xl font-black block mb-6 ${isDark ? "text-slate-800/40" : "text-zinc-200/60"}`}>03</span>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Connect Memory</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                  Cognee deduplicates and builds semantic edges between the new entities and existing patient nodes.
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 border border-zinc-800">
                <span className="text-zinc-600"># Cognee graph update</span>
                <div className="mt-1.5 text-zinc-200 overflow-x-auto whitespace-pre">
                  {"await cognee.remember(data)\nawait cognee.improve()"}
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className={`flex flex-col h-full justify-between border rounded-3xl p-6 shadow-sm ${
              isDark ? "bg-[#0a1025]/50 border-slate-800" : "bg-white border-zinc-200"
            }`}>
              <div>
                <span className={`text-5xl font-black block mb-6 ${isDark ? "text-slate-800/40" : "text-zinc-200/60"}`}>04</span>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-zinc-900"}`}>Query Contextually</h3>
                <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-500"}`}>
                  Retrieve answers using structured graph traversal. Receive exact timelines with citations.
                </p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-4 font-mono text-[10px] text-zinc-400 border border-zinc-800">
                <span className="text-zinc-600"># Recall graph connections</span>
                <div className="mt-1.5 text-zinc-200 overflow-x-auto whitespace-pre">
                  {"res = cognee.recall(\n  \"diabetes history\"\n)"}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Feature Deep-Dive Section */}
      <section id="features" className={`py-20 md:py-32 transition-colors duration-500 ${
        isDark ? "bg-[#080e20]/30 border-b border-slate-850" : "bg-white border-b border-zinc-100"
      } px-6`}>
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-up">
            <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-500 mb-3">Feature Suite</p>
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 ${
              isDark ? "text-white" : "text-zinc-900"
            }`}>
              Designed for clinical clarity
            </h2>
            <p className={`text-lg transition-colors duration-500 ${isDark ? "text-slate-400" : "text-zinc-650"}`}>
              A workspace developed to deliver high-fidelity structured memory interfaces.
            </p>
          </div>

          <div className="flex flex-col gap-24">
            
            {/* Feature 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up">
              <div className="lg:col-span-5 text-left">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                  isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-zinc-750"
                }`}>
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  Chronological Ledger
                </div>
                <h3 className={`text-2xl md:text-3xl font-black mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  The Longitudinal Timeline
                </h3>
                <p className={`leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                  Say goodbye to folders of PDFs. MediMemory normalizes disparate records, doctor consultations, and dates into one unified timeline. Every event is linked directly to its source document and automatically dedupes overlapping clinical entries.
                </p>
                <ul className={`flex flex-col gap-2.5 text-sm font-semibold ${isDark ? "text-slate-350" : "text-zinc-600"}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Auto-normalizes conflicting dates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Highlights critical diagnosis dates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Direct document references built-in
                  </li>
                </ul>
              </div>
              
              <div className={`lg:col-span-7 border rounded-3xl p-8 shadow-sm flex flex-col justify-center items-center min-h-[350px] relative overflow-hidden group transition-all duration-500 ${
                isDark ? "bg-[#0a1025]/30 border-slate-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-tr from-indigo-500/5 to-transparent" : "bg-gradient-to-tr from-indigo-50/30 to-transparent"}`} />
                {/* Visual Placeholder */}
                <div className={`w-full max-w-lg border rounded-2xl shadow-lg p-6 font-sans relative ${
                  isDark ? "bg-[#060b18] border-slate-800" : "bg-white border-zinc-200/80"
                }`}>
                  <div className={`absolute top-2 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                    isDark ? "text-slate-500 bg-slate-900/50 border-slate-800" : "text-zinc-400 bg-zinc-50 border-zinc-200"
                  }`}>
                    Screenshot Placeholder: Timeline
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">Timeline Ledger</h4>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-start border-l-2 border-indigo-500 pl-4 relative">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 absolute -left-[7px] top-1" />
                      <div>
                        <span className={`text-[10px] font-bold ${isDark ? "text-slate-500" : "text-zinc-400"}`}>June 20, 2026</span>
                        <p className={`text-xs font-black ${isDark ? "text-slate-200" : "text-zinc-800"}`}>Diabetes Mellitus Type II Diagnosed</p>
                        <p className={`text-[10px] ${isDark ? "text-slate-450" : "text-zinc-500"}`}>Dr. Sarah Jenkins · St. Jude Medical Center</p>
                      </div>
                    </div>
                    <div className={`flex gap-4 items-start border-l-2 pl-4 relative ${isDark ? "border-slate-800" : "border-zinc-200"}`}>
                      <div className="w-3 h-3 rounded-full bg-zinc-650 absolute -left-[7px] top-1" />
                      <div>
                        <span className={`text-[10px] font-bold ${isDark ? "text-slate-500" : "text-zinc-400"}`}>June 20, 2026</span>
                        <p className={`text-xs font-black ${isDark ? "text-slate-200" : "text-zinc-800"}`}>Metformin 500mg Daily Prescribed</p>
                        <p className={`text-[10px] ${isDark ? "text-slate-450" : "text-zinc-500"}`}>Linked to Diagnosis: Type II Diabetes</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start pl-4 relative">
                      <div className="w-3 h-3 rounded-full bg-zinc-650 absolute -left-1.5 top-1" />
                      <div>
                        <span className={`text-[10px] font-bold ${isDark ? "text-slate-500" : "text-zinc-400"}`}>July 04, 2026</span>
                        <p className={`text-xs font-black ${isDark ? "text-slate-200" : "text-zinc-800"}`}>Follow-up: HbA1c measured at 6.8%</p>
                        <p className={`text-[10px] ${isDark ? "text-slate-450" : "text-zinc-500"}`}>Progressive improvement detected</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center lg:flex-row-reverse animate-fade-up">
              <div className="lg:col-span-5 lg:order-last text-left">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                  isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-zinc-750"
                }`}>
                  <Network className="w-3.5 h-3.5 text-indigo-500" />
                  Graph Visualization
                </div>
                <h3 className={`text-2xl md:text-3xl font-black mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  The Relationship Explorer
                </h3>
                <p className={`leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                  Navigate clinical concepts visually. The relationship explorer maps conditions, medical visits, drug orders, reactions, and symptoms as interactive nodes. Click on a medicine to reveal the doctor who ordered it, the condition it treats, and corresponding outcomes.
                </p>
                <ul className={`flex flex-col gap-2.5 text-sm font-semibold ${isDark ? "text-slate-350" : "text-zinc-600"}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Interactive graph node traversal
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Inspect metadata inside a sidebar detail view
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Trace connection pathways automatically
                  </li>
                </ul>
              </div>
              
              <div className={`lg:col-span-7 border rounded-3xl p-8 shadow-sm flex flex-col justify-center items-center min-h-[350px] relative overflow-hidden group transition-all duration-500 ${
                isDark ? "bg-[#0a1025]/30 border-slate-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-tr from-indigo-500/5 to-transparent" : "bg-gradient-to-tr from-indigo-50/30 to-transparent"}`} />
                {/* Visual Placeholder */}
                <div className={`w-full max-w-lg border rounded-2xl shadow-lg p-6 relative flex flex-col items-center justify-center min-h-[220px] ${
                  isDark ? "bg-[#060b18] border-slate-800" : "bg-white border-zinc-200/80"
                }`}>
                  <div className={`absolute top-2 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                    isDark ? "text-slate-500 bg-slate-900/50 border-slate-800" : "text-zinc-400 bg-zinc-50 border-zinc-200"
                  }`}>
                    Screenshot Placeholder: Relationship Explorer
                  </div>
                  
                  {/* Mock node-link structure */}
                  <div className="flex flex-col items-center gap-6 w-full relative py-6">
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-650 text-white text-xs font-bold font-mono">Patient (Jane Doe)</div>
                    <div className={`w-[2px] h-6 ${isDark ? "bg-slate-800" : "bg-zinc-250"}`} />
                    <div className="flex gap-12">
                      <div className="flex flex-col items-center">
                        <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold font-mono ${
                          isDark ? "bg-indigo-950/40 border-indigo-900 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-800"
                        }`}>Disease (Diabetes)</div>
                        <div className={`w-[2px] h-6 ${isDark ? "bg-slate-800" : "bg-indigo-200"}`} />
                        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono ${
                          isDark ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-zinc-50 border-zinc-200 text-zinc-650"
                        }`}>Medication (Metformin)</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold font-mono ${
                          isDark ? "bg-indigo-950/40 border-indigo-900 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-800"
                        }`}>Allergy (Penicillin)</div>
                        <div className={`w-[2px] h-6 ${isDark ? "bg-slate-800" : "bg-indigo-200"}`} />
                        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono ${
                          isDark ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-zinc-50 border-zinc-200 text-zinc-650"
                        }`}>Reaction (Anaphylaxis)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up">
              <div className="lg:col-span-5 text-left">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                  isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-zinc-750"
                }`}>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Semantic Query
                </div>
                <h3 className={`text-2xl md:text-3xl font-black mb-4 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  AI-Powered Medical Search
                </h3>
                <p className={`leading-relaxed mb-6 ${isDark ? "text-slate-400" : "text-zinc-600"}`}>
                  Query the clinical graph using standard language. MediMemory queries patient facts directly through Cognee, traversing connected relationships rather than running keyword lookups. Recalls exact evidence with direct footnotes.
                </p>
                <ul className={`flex flex-col gap-2.5 text-sm font-semibold ${isDark ? "text-slate-350" : "text-zinc-600"}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Grounded replies, zero AI hallucinations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Footnote references to source reports
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Direct comparative history generation
                  </li>
                </ul>
              </div>
              
              <div className={`lg:col-span-7 border rounded-3xl p-8 shadow-sm flex flex-col justify-center items-center min-h-[350px] relative overflow-hidden group transition-all duration-500 ${
                isDark ? "bg-[#0a1025]/30 border-slate-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-tr from-indigo-500/5 to-transparent" : "bg-gradient-to-tr from-indigo-50/30 to-transparent"}`} />
                {/* Visual Placeholder */}
                <div className={`w-full max-w-lg border rounded-2xl shadow-lg p-6 relative font-sans ${
                  isDark ? "bg-[#060b18] border-slate-800" : "bg-white border-zinc-200/80"
                }`}>
                  <div className={`absolute top-2 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${
                    isDark ? "text-slate-500 bg-slate-900/50 border-slate-800" : "text-zinc-400 bg-zinc-50 border-zinc-200"
                  }`}>
                    Screenshot Placeholder: Query Panel
                  </div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-slate-400" : "text-zinc-450"}`}>AI Query Panel</h4>
                  <div className="flex flex-col gap-3">
                    <div className={`border rounded-xl p-3 text-[11px] font-semibold ${
                      isDark ? "bg-slate-900/80 border-slate-800 text-slate-200" : "bg-slate-50 border-zinc-250 text-zinc-700"
                    }`}>
                      "Compare the HbA1c history and medication change details."
                    </div>
                    <div className={`border rounded-xl p-3.5 text-[11px] leading-relaxed ${
                      isDark ? "border-slate-800 bg-indigo-500/5 text-slate-350" : "border-zinc-100 bg-indigo-50/10 text-zinc-600"
                    }`}>
                      <p className={`font-bold mb-1 ${isDark ? "text-white" : "text-zinc-800"}`}>Answer:</p>
                      Patient HbA1c was measured at <strong className={isDark ? "text-white" : "text-zinc-850"}>8.2%</strong> on Jan 10, 2026, leading to a Metformin dosage hike. On June 20, 2026, HbA1c dropped to <strong className={isDark ? "text-white" : "text-zinc-850"}>6.8%</strong>, and Metformin was stabilized at 500mg daily.
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`px-1.5 py-0.5 font-bold rounded text-[9px] cursor-pointer ${
                          isDark ? "bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        }`}>[1] Lab_Report_Jan2026.pdf</span>
                        <span className={`px-1.5 py-0.5 font-bold rounded text-[9px] cursor-pointer ${
                          isDark ? "bg-indigo-900/60 text-indigo-300 hover:bg-indigo-900" : "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        }`}>[2] Clinician_Note_June2026.pdf</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Why This Matters Section (Quote) */}
      <section className={`py-20 md:py-32 border-y transition-colors duration-500 ${
        isDark ? "bg-[#060b18] border-slate-850" : "bg-slate-50 border-zinc-150"
      } px-6`}>
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          <p className="text-xs uppercase tracking-wider font-extrabold text-indigo-500 mb-6">Why This Matters</p>
          <blockquote className={`text-xl md:text-2xl font-medium leading-relaxed italic mb-8 transition-colors duration-500 ${
            isDark ? "text-slate-200" : "text-zinc-800"
          }`}>
            "When my aging parents started seeing different specialists for their chronic conditions, we realized their medical history lived in a black box of paper folders and disjointed portals. No single doctor had the full picture, and critical details were lost in transit. We built MediMemory because health data isn't a collection of separate documents — it's a lifelong timeline of cause and effect."
          </blockquote>
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black mb-3">
              MM
            </div>
            <cite className={`not-italic font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>MediMemory Founder</cite>
            <span className="text-xs text-zinc-500 mt-0.5">Continuous Health Memory Project</span>
          </div>
        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section className={`py-24 md:py-32 transition-colors duration-500 text-center relative overflow-hidden px-6 ${
        isDark ? "bg-[#060b18]" : "bg-white"
      }`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-3xl pointer-events-none rounded-full transition-colors duration-500 ${
          isDark ? "bg-indigo-500/5" : "bg-indigo-50"
        }`} />
        
        <div className="max-w-3xl mx-auto relative flex flex-col items-center animate-fade-up">
          <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6 ${
            isDark ? "text-white" : "text-zinc-900"
          }`}>
            Give your family's health a memory.
          </h2>
          <p className={`text-base md:text-lg leading-relaxed max-w-xl mb-10 transition-colors duration-500 ${
            isDark ? "text-slate-400" : "text-zinc-500"
          }`}>
            Launch the application directory, register a patient profile, and construct your first clinical relationship graph today.
          </p>
          <Link
            href="/patients"
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.02]"
          >
            Launch Patient Directory
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-900 px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Brain className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-white font-bold text-sm">MediMemory</span>
              <p className="text-[10px] text-zinc-500 mt-0.5">Lifelong medical knowledge graphs.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-semibold">
            <a href="https://github.com/MidnightMaverick07/MediMemory" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://dev.to" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Dev.to Article</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X</a>
          </div>

          <p className="text-[11px] text-zinc-650 font-medium">
            &copy; {new Date().getFullYear()} MediMemory. Powered by Cognee & Gemini. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
