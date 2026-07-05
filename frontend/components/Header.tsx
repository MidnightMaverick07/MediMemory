"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, User, Activity, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
}

interface HeaderProps {
  currentPatientId: number;
  activePortal: "patient" | "doctor";
  activeTab: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Header({ currentPatientId, activePortal, activeTab }: HeaderProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch(`${API_BASE}/patients`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch (err) {
        console.error("Failed to fetch patients in Header", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, []);

  const handlePatientChange = (newId: number) => {
    if (activePortal === "patient") {
      // Map tabs: profile, timeline, upload, evolution
      router.push(`/patient/${newId}/${activeTab}`);
    } else {
      // Map tabs: dashboard, query, graph
      router.push(`/doctor/${newId}/${activeTab}`);
    }
  };

  const togglePortal = () => {
    if (activePortal === "patient") {
      router.push(`/doctor/${currentPatientId}/dashboard`);
    } else {
      router.push(`/patient/${currentPatientId}/profile`);
    }
  };

  const activePatient = patients.find((p) => p.id === currentPatientId);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                MediMemory
              </h1>
              <p className="text-[10px] text-indigo-400 font-medium tracking-wide uppercase">
                Longitudinal Health Memory
              </p>
            </div>
          </Link>
        </div>

        {/* Central Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Back to Directory */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Directory
          </Link>

          {/* Patient Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Active Patient:</span>
            {loading ? (
              <div className="w-[160px] h-9 bg-slate-800 animate-pulse rounded-xl" />
            ) : (
              <select
                value={currentPatientId}
                onChange={(e) => handlePatientChange(Number(e.target.value))}
                className="bg-slate-850 border border-slate-700 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-slate-800 transition-colors text-white font-medium min-w-[160px]"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Age {p.age})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Portal Switcher */}
          <button
            onClick={togglePortal}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-850 border border-slate-700/80 rounded-xl text-xs font-bold transition-all text-indigo-400 hover:text-indigo-300"
          >
            {activePortal === "patient" ? (
              <>
                <ToggleLeft className="w-4 h-4" />
                Switch to Doctor View
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4" />
                Switch to Patient View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-800/65 flex flex-wrap gap-2 justify-center md:justify-start">
        {activePortal === "patient" ? (
          <>
            <Link
              href={`/patient/${currentPatientId}/profile`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Patient Profile
            </Link>
            <Link
              href={`/patient/${currentPatientId}/timeline`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "timeline"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Health Timeline
            </Link>
            <Link
              href={`/patient/${currentPatientId}/upload`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "upload"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Upload Report
            </Link>
            <Link
              href={`/patient/${currentPatientId}/evolution`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "evolution"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Memory Evolution
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/doctor/${currentPatientId}/dashboard`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Doctor Dashboard
            </Link>
            <Link
              href={`/doctor/${currentPatientId}/query`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "query"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Ask AI Memory
            </Link>
            <Link
              href={`/doctor/${currentPatientId}/graph`}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "graph"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-800/30 hover:bg-slate-800/70"
              }`}
            >
              Relationship Explorer
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
