"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  UserPlus, 
  User, 
  Activity, 
  ChevronRight, 
  FileText, 
  Plus, 
  ArrowRight,
  ClipboardList,
  Heart,
  Sun,
  Moon,
  Trash2
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PatientDirectory() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  // New Patient Form State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<string>("Male");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/patients`);
      if (!res.ok) throw new Error("Could not connect to API.");
      const data = await res.json();
      setPatients(data);
    } catch (err: any) {
      setError("FastAPI Backend is offline or database cannot be reached.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (patientId: number, patientName: string) => {
    if (!confirm(`Are you sure you want to delete patient "${patientName}" and completely forget their clinical memory graph? This action is irreversible.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchPatients();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete patient.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while deleting the patient.");
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age,
          gender,
          demographics: {
            blood_group: bloodGroup,
            height: height.replace(/\s*cm/gi, "").trim(),
            weight: weight.replace(/\s*kg/gi, "").trim(),
            emergency_contact: emergencyContact
          }
        })
      });

      if (!res.ok) throw new Error("Failed to create patient.");
      
      const newPatient = await res.json();
      setShowModal(false);
      
      // Redirect to the newly created patient profile page
      router.push(`/patient/${newPatient.id}/profile`);
    } catch (err: any) {
      alert(err.message || "An error occurred creating the patient.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 px-6 py-12 md:py-16">
        {/* Soft Background Accents */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/5 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
              <Brain className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                MediMemory
              </h1>
              <p className="text-sm text-indigo-400 font-semibold tracking-wide uppercase mt-0.5">
                Longitudinal Health Memory Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 rounded-2xl text-slate-300 hover:text-white transition-all shadow-md"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Register New Patient
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Patient Directory</h2>
            <p className="text-xs text-slate-400 mt-1">Select a patient to view their clinical records and memory graph.</p>
          </div>
          {error && (
            <button 
              onClick={fetchPatients}
              className="text-xs px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-all font-bold"
            >
              Retry Connection
            </button>
          )}
        </div>

        {error && (
          <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-center">
            <p className="text-sm text-rose-300 font-semibold">{error}</p>
            <p className="text-xs text-slate-500 mt-1">Please ensure your FastAPI backend is running on port 8000.</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Activity className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium">Loading registered patient records...</p>
          </div>
        ) : !error && patients.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/10 flex flex-col items-center justify-center">
            <User className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-300">No Patients Registered</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mb-4">Create your first patient profile to begin constructing medical graphs.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              Add First Patient
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((p) => (
              <div 
                key={p.id}
                className="bg-slate-900/30 border border-slate-850 hover:border-indigo-500/40 rounded-3xl p-6 backdrop-blur-sm transition-all flex flex-col justify-between gap-6 shadow-sm hover:shadow-indigo-500/5 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePatient(p.id, p.name);
                  }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-rose-500 hover:scale-105 transition-all p-1.5 z-10"
                  title="Delete Patient & Forget Clinical Memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium">
                      <span>Age: {p.age}</span>
                      <span>•</span>
                      <span>{p.gender}</span>
                    </div>
                  </div>
                </div>

                {/* Micro-Demographics indicators */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider font-bold">Blood</span>
                    <span className="font-semibold text-rose-400 block mt-0.5">{p.demographics?.blood_group || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider font-bold">Height</span>
                    <span className="font-semibold text-slate-200 block mt-0.5">{p.demographics?.height ? `${String(p.demographics.height).replace(/\s*cm/gi, "")} cm` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider font-bold">Weight</span>
                    <span className="font-semibold text-slate-200 block mt-0.5">{p.demographics?.weight ? `${String(p.demographics.weight).replace(/\s*kg/gi, "")} kg` : "—"}</span>
                  </div>
                </div>

                {/* Portals entrance */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href={`/patient/${p.id}/profile`}
                    className="flex items-center justify-center gap-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-xs font-bold rounded-xl text-slate-200 transition-all"
                  >
                    Patient Portal
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/doctor/${p.id}/dashboard`}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/5 transition-all"
                  >
                    Doctor Portal
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* NEW PATIENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
            
            <div>
              <h3 className="text-base font-bold text-white">Register New Patient</h3>
              <p className="text-xs text-slate-400 mt-1">Add patient details to establish their root entity in the memory graph.</p>
            </div>
            
            <div className="h-[1px] bg-slate-800 w-full" />

            <form onSubmit={handleCreatePatient} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium placeholder-slate-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Age (Years)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Blood Group</label>
                  <input
                    type="text"
                    value={bloodGroup}
                    placeholder="e.g. A+"
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium placeholder-slate-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Height (cm)</label>
                  <input
                    type="text"
                    value={height}
                    placeholder="e.g. 175"
                    onChange={(e) => setHeight(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium placeholder-slate-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Weight (kg)</label>
                  <input
                    type="text"
                    value={weight}
                    placeholder="e.g. 70"
                    onChange={(e) => setWeight(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Emergency Contact</label>
                <input
                  type="text"
                  value={emergencyContact}
                  placeholder="e.g. Spouse: +1-555-0199"
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors text-white font-medium placeholder-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating && <Activity className="w-3.5 h-3.5 animate-spin" />}
                  {creating ? "Creating Memory Root..." : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium gap-2">
          <span>&copy; {new Date().getFullYear()} MediMemory. Powered by Cognee Cognitive Graph.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Cognee Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
