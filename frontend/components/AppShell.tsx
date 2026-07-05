"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

interface AppShellProps {
  children: React.ReactNode;
  currentPatientId: number;
  role: "doctor" | "patient";
}

export default function AppShell({ children, currentPatientId, role }: AppShellProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#060b18] light:bg-slate-50 text-slate-100 light:text-slate-900 overflow-hidden font-sans">
      {/* Persistent left collapsible sidebar */}
      <Sidebar 
        currentPatientId={currentPatientId} 
        role={role} 
        isOpenMobile={isOpenMobile} 
        onCloseMobile={() => setIsOpenMobile(false)} 
      />

      {/* Main viewport area */}
      <div className="flex-1 min-h-screen flex flex-col md:pl-[68px] overflow-hidden relative">
        {/* Compact Toolbar */}
        <TopHeader 
          currentPatientId={currentPatientId} 
          role={role} 
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
