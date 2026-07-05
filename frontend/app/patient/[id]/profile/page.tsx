"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { 
  User, 
  Settings, 
  Upload, 
  ShieldAlert, 
  Sparkles, 
  HeartPulse, 
  Clock, 
  Activity, 
  Edit3, 
  Save, 
  X,
  FileText,
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

interface ActivityLog {
  id: number;
  patient_id: number;
  event_type: string;
  details: string;
  timestamp: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editAge, setEditAge] = useState<number>(0);
  const [editGender, setEditGender] = useState<string>("");
  const [editBloodGroup, setEditBloodGroup] = useState<string>("");
  const [editHeight, setEditHeight] = useState<string>("");
  const [editWeight, setEditWeight] = useState<string>("");
  const [editEmergencyContact, setEditEmergencyContact] = useState<string>("");
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch patient details
      const patientRes = await fetch(`${API_BASE}/patients/${patientId}`);
      if (!patientRes.ok) {
        throw new Error("Patient not found in database.");
      }
      const patientData: Patient = await patientRes.json();
      setPatient(patientData);

      // Populate edit fields
      setEditName(patientData.name);
      setEditAge(patientData.age);
      setEditGender(patientData.gender);
      setEditBloodGroup(patientData.demographics?.blood_group || "");
      setEditHeight(patientData.demographics?.height || "");
      setEditWeight(patientData.demographics?.weight || "");
      setEditEmergencyContact(patientData.demographics?.emergency_contact || "");

      // Fetch activity logs
      const activityRes = await fetch(`${API_BASE}/patients/${patientId}/activity`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.slice(0, 5)); // show latest 5
      }
    } catch (err: any) {
      setError(err.message || "Failed to load patient profile.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    
    setUpdating(true);
    try {
      const updatedDemographics = {
        ...patient.demographics,
        blood_group: editBloodGroup,
        height: editHeight,
        weight: editWeight,
        emergency_contact: editEmergencyContact
      };

      const res = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          age: editAge,
          gender: editGender,
          demographics: updatedDemographics
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update profile.");
      }

      const freshData = await res.json();
      setPatient(freshData);
      setIsEditing(false);
      
      // Refresh activities list
      const activityRes = await fetch(`${API_BASE}/patients/${patientId}/activity`);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(activityData.slice(0, 5));
      }
    } catch (err: any) {
      alert(err.message || "An error occurred updating the profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center">
          <Activity className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm text-slate-400 font-medium">Recalling patient details...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-200 mb-2">Failed to Load Profile</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">{error || "Patient not found."}</p>
          <Link
            href="/patients"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6 selection:bg-indigo-500 selection:text-white">
        {/* Profile Card */}
        <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          {/* Glassy Background Gradient Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />
          
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 md:w-32 md:w-32 bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 border-2 border-indigo-500/30 rounded-3xl flex items-center justify-center shadow-inner relative group">
              <User className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 group-hover:scale-105 transition-transform" />
              <div className="absolute -bottom-1.5 -right-1.5 p-2 bg-indigo-600 rounded-xl shadow-lg border border-indigo-500">
                <UserCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <h2 className="text-2xl font-black text-white tracking-tight">{patient.name}</h2>
                <span className="self-center md:self-auto text-xs px-2.5 py-0.5 bg-slate-800 text-indigo-400 rounded-full font-bold border border-slate-700/60 uppercase tracking-wide">
                  Patient Profile
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Registered: {new Date(patient.id * 1000).toLocaleDateString() || "Lifelong Memory ID: " + patient.id}</p>
            </div>

            {/* Vital Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Age</span>
                <span className="text-sm font-semibold text-white mt-1 block">{patient.age} Years</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Gender</span>
                <span className="text-sm font-semibold text-white mt-1 block">{patient.gender}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Blood Group</span>
                <span className="text-sm font-semibold text-rose-400 mt-1 block">{patient.demographics?.blood_group || "Not Set"}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Height</span>
                <span className="text-sm font-semibold text-white mt-1 block">{patient.demographics?.height ? `${patient.demographics.height} cm` : "Not Set"}</span>
              </div>
            </div>

            {/* Sub information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Weight</span>
                <span className="text-sm font-semibold text-white mt-1 block">{patient.demographics?.weight ? `${patient.demographics.weight} kg` : "Not Set"}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Emergency Contact</span>
                <span className="text-sm font-semibold text-white mt-1 block truncate" title={patient.demographics?.emergency_contact}>
                  {patient.demographics?.emergency_contact || "Not Set"}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              
              <Link
                href={`/patient/${patientId}/upload`}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Medical Report
              </Link>
            </div>
          </div>
        </div>

        {/* Memory Ingestion Status Card */}
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">Graph Root Status</h3>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded uppercase">
              Registered Root Node
            </span>
          </div>
          <div className="h-[1px] bg-slate-800/80 w-full" />
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            This profile details the Patient Root Node in Cognee's ontological semantic graph. 
            All reports, diagnoses, treatments, medications, and visits uploaded under this patient ID will directly attach to this identity. 
            Modifying patient profile attributes triggers a background `cognee.improve()` consolidation pass to keep the graph's metadata aligned.
          </p>
        </div>

        {/* Recent Operations log */}
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Recent Memory Operations</h3>
          </div>
          <div className="h-[1px] bg-slate-800/80 w-full" />
          {activities.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No database operations logged.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-800/40 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg border ${
                      act.event_type === "remember"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : act.event_type === "improve"
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">cognee.{act.event_type}()</p>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed mt-0.5">{act.details}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap font-medium">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>


      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl pointer-events-none rounded-full" />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Edit Patient Profile</h3>
                <p className="text-xs text-slate-400 mt-1">Update patient information and demographics saved in memory.</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="h-[1px] bg-slate-800 w-full" />

            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium"
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
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium"
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
                    value={editBloodGroup}
                    placeholder="e.g. A+"
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium placeholder-slate-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Height (cm)</label>
                  <input
                    type="text"
                    value={editHeight}
                    placeholder="e.g. 175"
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium placeholder-slate-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Weight (kg)</label>
                  <input
                    type="text"
                    value={editWeight}
                    placeholder="e.g. 70"
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium placeholder-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Emergency Contact</label>
                <input
                  type="text"
                  value={editEmergencyContact}
                  placeholder="e.g. Jane Doe: +1-555-0199"
                  onChange={(e) => setEditEmergencyContact(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white font-medium placeholder-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all animate-fade-in"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {updating ? (
                    <Activity className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {updating ? "Saving Ontological Refinement..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
