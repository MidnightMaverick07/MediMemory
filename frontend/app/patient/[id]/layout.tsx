"use client";

import React, { use } from "react";
import AppShell from "@/components/AppShell";

export default function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const patientId = Number(resolvedParams.id);

  return (
    <AppShell currentPatientId={patientId} role="patient">
      {children}
    </AppShell>
  );
}
