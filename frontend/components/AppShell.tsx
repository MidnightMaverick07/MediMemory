"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface AppShellProps {
  children: React.ReactNode;
  currentPatientId: number;
  role: "doctor" | "patient";
}

export default function AppShell({ children, currentPatientId, role }: AppShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [activeRole, setActiveRole] = useState<"doctor" | "patient">(role);

  useEffect(() => {
    // Check search query parameters on the client side
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get("role");
    if (queryRole === "doctor" || queryRole === "patient") {
      setActiveRole(queryRole);
    } else {
      setActiveRole(role);
    }
  }, [role]);

  return (
    <div className="min-h-screen flex bg-[#060b18] light:bg-slate-50 text-slate-100 light:text-slate-900 overflow-hidden font-sans">
      {/* Persistent left collapsible sidebar */}
      <Sidebar 
        currentPatientId={currentPatientId} 
        role={activeRole} 
        isOpenMobile={isOpenMobile} 
        onCloseMobile={() => setIsOpenMobile(false)} 
      />

      {/* Main viewport area */}
      <div className="flex-1 min-h-screen flex flex-col md:pl-[68px] overflow-hidden relative">
        {/* Compact Toolbar */}
        <TopHeader 
          currentPatientId={currentPatientId} 
          role={activeRole} 
          onMenuClick={() => setIsOpenMobile(true)} 
        />

        {/* Dynamic page content container */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
