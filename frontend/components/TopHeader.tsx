"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Menu, Sun, Moon, ArrowLeftRight, ToggleLeft, ToggleRight } from "lucide-react";

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
}

interface TopHeaderProps {
  currentPatientId: number;
  role: "doctor" | "patient";
  onMenuClick: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TopHeader({ currentPatientId, role, onMenuClick }: TopHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Sync theme state on load
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "light";
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

  useEffect(() => {
    async function fetchPatients() {
      try {
        const res = await fetch(`${API_BASE}/patients`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data);
        }
      } catch (err) {
        console.error("Failed to fetch patients in TopHeader", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, []);

  const handlePatientChange = (newId: number) => {
    // Map same tab on patient change
    // e.g. path format /doctor/[id]/query -> /doctor/[newId]/query
    const segments = pathname ? pathname.split("/") : [];
    if (segments.length >= 4) {
      segments[2] = String(newId);
      router.push(segments.join("/"));
    } else {
      if (role === "patient") {
        router.push(`/patient/${newId}/profile`);
      } else {
        router.push(`/doctor/${newId}/dashboard`);
      }
    }
  };

  // Determine page title based on current pathname
  const getPageTitle = () => {
    if (!pathname) return "MediMemory";
    if (pathname.includes("/dashboard")) return "Doctor Dashboard";
    if (pathname.includes("/query")) return "Ask AI Clinical Memory";
    if (pathname.includes("/graph")) return "Relationship Explorer";
    if (pathname.includes("/profile")) return "Patient Profile";
    if (pathname.includes("/timeline")) return "Health Timeline";
    if (pathname.includes("/upload")) return "Upload Report";
    if (pathname.includes("/evolution")) return "Memory Evolution";
    return "MediMemory";
  };

  return (
    <header className="h-[64px] bg-[#0d1530]/80 light:bg-white/90 backdrop-blur-md border-b border-slate-850 light:border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
      {/* Left section: Hamburger (mobile only) & Breadcrumb / Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="p-1.5 text-slate-400 hover:text-white light:hover:text-slate-900 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block md:hidden">
            {role === "doctor" ? "Doctor Mode" : "Patient Mode"}
          </span>
          <h2 className="text-sm md:text-base font-black text-white light:text-slate-900 tracking-tight leading-tight">
            {getPageTitle()}
          </h2>
        </div>
      </div>

      {/* Right section: Context Controls */}
      <div className="flex items-center gap-3">
        {/* Back to Directory button */}
        <Link
          href="/"
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-750 light:border-slate-200 rounded-xl text-[11px] font-bold text-slate-300 light:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Directory</span>
        </Link>

        {/* Patient Selector */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-[140px] h-8 bg-slate-800 animate-pulse rounded-xl" />
          ) : (
            <select
              value={currentPatientId}
              onChange={(e) => handlePatientChange(Number(e.target.value))}
              className="bg-slate-850 border border-slate-750 light:border-slate-200 text-[11px] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-800 transition-colors text-white light:text-slate-900 font-bold min-w-[120px] max-w-[180px]"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-750 light:border-slate-200 rounded-xl text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
