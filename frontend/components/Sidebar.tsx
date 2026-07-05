"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Brain, LogOut, ArrowLeftRight, User, Menu, X, ChevronRight,
  Activity, Calendar, FileText, Pill, Heart, Stethoscope, 
  FolderOpen, Link2, History, Upload, Network
} from "lucide-react";
import { navigationConfig, NavItem } from "@/config/navigationConfig";

const iconMap: Record<string, React.ComponentType<any>> = {
  Activity, Brain, Network, Calendar, User, Upload, FileText, Pill, Heart, Stethoscope, FolderOpen, Link2, History
};

interface SidebarProps {
  currentPatientId: number;
  role: "doctor" | "patient";
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ currentPatientId, role, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isTabletExpanded, setIsTabletExpanded] = useState(false);
  const [patientName, setPatientName] = useState<string>("");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isExpanded = isHovered || isTabletExpanded || isOpenMobile;
  const items = navigationConfig[role] || [];

  // Fetch patient name to display in the profile section
  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/patients/${currentPatientId}`);
        if (res.ok) {
          const data = await res.json();
          setPatientName(data.name);
        }
      } catch (err) {
        console.error("Failed to fetch patient details in Sidebar", err);
      }
    }
    fetchPatient();
  }, [currentPatientId]);

  // Click outside to collapse tablet/mobile sidebar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsTabletExpanded(false);
        if (isOpenMobile && onCloseMobile) {
          onCloseMobile();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpenMobile, onCloseMobile]);

  // Toggle portal role
  const handleTogglePortal = () => {
    if (role === "doctor") {
      router.push(`/patient/${currentPatientId}/profile`);
    } else {
      router.push(`/doctor/${currentPatientId}/dashboard`);
    }
  };

  // Group items by section (only for doctor view)
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    items.forEach(item => {
      const sec = item.section || "Primary";
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(item);
    });
    return groups;
  }, [items]);

  const renderItem = (item: NavItem) => {
    const IconComponent = iconMap[item.iconName] || Activity;
    const isActive = item.activeMatch(pathname || "", currentPatientId);
    const targetRoute = item.route(currentPatientId);

    return (
      <Link
        key={item.label}
        href={targetRoute}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center rounded-xl text-xs font-bold transition-all group relative duration-200 ${
          isExpanded ? "w-full py-1.5 px-3 gap-2.5" : "w-10 h-10 justify-center gap-0 px-0"
        } ${
          isActive 
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/15 sidebar-link-active" 
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 light:hover:text-slate-900 light:hover:bg-slate-100 sidebar-link-inactive"
        }`}
      >
        <IconComponent className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"}`} />
        
        {/* Label - visible only when expanded */}
        <span 
          className={`whitespace-nowrap transition-all duration-300 ${
            isExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none w-0 overflow-hidden"
          }`}
        >
          {item.label}
        </span>

        {/* Collapsed Tooltip */}
        {!isExpanded && (
          <div className="absolute left-14 invisible group-hover:visible bg-slate-900 border border-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-md shadow-xl whitespace-nowrap z-50 transition-opacity opacity-0 group-hover:opacity-100 delay-100 pointer-events-none">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 bottom-0 left-0 bg-[#080d1f] border-r border-slate-850 z-40 flex flex-col justify-between transition-all duration-300 ease-out shadow-2xl overflow-x-hidden ${
        isExpanded ? "w-[210px]" : "w-[68px]"
      } ${
        isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-850">
        <Link href="/patients" className="flex items-center gap-3 group overflow-hidden">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shrink-0">
            <Brain className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className={`transition-all duration-300 ${isExpanded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none w-0"}`}>
            <h1 className="text-sm font-black text-white leading-none sidebar-logo-text">MediMemory</h1>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mt-0.5">Clinical Graph</span>
          </div>
        </Link>
        {isOpenMobile && (
          <button onClick={onCloseMobile} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto py-3 px-3.5 flex flex-col gap-3 scrollbar-none">
        {role === "doctor" ? (
          // Grouped sidebar format for Doctor View
          Object.entries(groupedItems).map(([sectionName, sectionItems]) => (
            <div key={sectionName} className="flex flex-col gap-1">
              {isExpanded && (
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 mb-1 block">
                  {sectionName}
                </span>
              )}
              {sectionItems.map(renderItem)}
            </div>
          ))
        ) : (
          // Standard flat navigation format for Patient View
          <div className="flex flex-col gap-1">
            {items.map(renderItem)}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-850 flex flex-col gap-3 bg-[#070b1a]">
        {/* Toggle Portal Button */}
        <button
          onClick={handleTogglePortal}
          className={`flex items-center bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold transition-all overflow-hidden ${
            isExpanded ? "justify-start px-3 py-2 gap-2.5 w-full" : "w-10 h-10 justify-center p-0 gap-0"
          }`}
          title={role === "doctor" ? "Switch to Patient View" : "Switch to Doctor View"}
        >
          <ArrowLeftRight className="w-4 h-4 shrink-0" />
          {isExpanded && (
            <span className="whitespace-nowrap transition-opacity duration-300">
              {role === "doctor" ? "Patient Portal" : "Doctor Portal"}
            </span>
          )}
        </button>

        {/* User profile section */}
        <div className={`flex items-center gap-3 overflow-hidden ${isExpanded ? "justify-start" : "justify-center"}`}>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0">
            <User className="w-4 h-4" />
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-opacity duration-300">
              <span className="text-xs font-black text-white truncate">{patientName || `Patient #${currentPatientId}`}</span>
              <span className="text-[10px] text-indigo-400 font-bold tracking-wider truncate uppercase mt-0.5 sidebar-user-role">
                {role === "doctor" ? "Doctor Mode" : "Patient Mode"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
