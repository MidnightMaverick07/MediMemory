import { 
  Activity, Brain, Network, Calendar, User, 
  Upload, FileText, Pill, Heart, Stethoscope, 
  FolderOpen, Link2, History
} from "lucide-react";

export interface NavItem {
  label: string;
  iconName: string;
  route: (patientId: number) => string;
  activeMatch: (pathname: string, patientId: number) => boolean;
  section?: string;
}

export const navigationConfig: {
  doctor: NavItem[];
  patient: NavItem[];
} = {
  doctor: [
    // Primary Navigation
    {
      label: "Overview",
      iconName: "Activity",
      route: (id: number) => `/doctor/${id}/dashboard`,
      activeMatch: (path: string, id: number) => path === `/doctor/${id}/dashboard`,
      section: "Primary Navigation",
    },
    {
      label: "Ask AI Memory",
      iconName: "Brain",
      route: (id: number) => `/doctor/${id}/query`,
      activeMatch: (path: string, id: number) => path === `/doctor/${id}/query`,
      section: "Primary Navigation",
    },
    {
      label: "Relationship Explorer",
      iconName: "Network",
      route: (id: number) => `/doctor/${id}/graph`,
      activeMatch: (path: string, id: number) => path === `/doctor/${id}/graph` && !path.includes("highlight"),
      section: "Primary Navigation",
    },
    // Patient Records
    {
      label: "Timeline",
      iconName: "Calendar",
      route: (id: number) => `/patient/${id}/timeline`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/timeline`,
      section: "Patient Records",
    },
    {
      label: "Reports",
      iconName: "FileText",
      route: (id: number) => `/patient/${id}/upload`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/upload`,
      section: "Patient Records",
    },
    {
      label: "Medications",
      iconName: "Pill",
      route: (id: number) => `/doctor/${id}/graph?highlight=medication`,
      activeMatch: (path: string, id: number) => path.includes(`/doctor/${id}/graph`) && path.includes("highlight=medication"),
      section: "Patient Records",
    },
    {
      label: "Conditions",
      iconName: "Heart",
      route: (id: number) => `/doctor/${id}/graph?highlight=disease`,
      activeMatch: (path: string, id: number) => path.includes(`/doctor/${id}/graph`) && path.includes("highlight=disease"),
      section: "Patient Records",
    },
    {
      label: "Labs",
      iconName: "FolderOpen",
      route: (id: number) => `/doctor/${id}/graph?highlight=lab`,
      activeMatch: (path: string, id: number) => path.includes(`/doctor/${id}/graph`) && path.includes("highlight=lab"),
      section: "Patient Records",
    },
    {
      label: "Procedures",
      iconName: "Stethoscope",
      route: (id: number) => `/doctor/${id}/graph?highlight=surgery`,
      activeMatch: (path: string, id: number) => path.includes(`/doctor/${id}/graph`) && path.includes("highlight=surgery"),
      section: "Patient Records",
    },
    {
      label: "All Records",
      iconName: "FolderOpen",
      route: (id: number) => `/patient/${id}/timeline`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/timeline`,
      section: "Patient Records",
    },
    {
      label: "Connections",
      iconName: "Link2",
      route: (id: number) => `/doctor/${id}/graph`,
      activeMatch: (path: string, id: number) => path === `/doctor/${id}/graph` && !path.includes("highlight"),
      section: "Patient Records",
    },
    // Actions
    {
      label: "Upload Report",
      iconName: "Upload",
      route: (id: number) => `/patient/${id}/upload`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/upload`,
      section: "Actions",
    }
  ],
  patient: [
    {
      label: "Patient Profile",
      iconName: "User",
      route: (id: number) => `/patient/${id}/profile`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/profile`,
    },
    {
      label: "Health Timeline",
      iconName: "Calendar",
      route: (id: number) => `/patient/${id}/timeline`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/timeline`,
    },
    {
      label: "Upload Report",
      iconName: "Upload",
      route: (id: number) => `/patient/${id}/upload`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/upload`,
    },
    {
      label: "Memory Evolution",
      iconName: "History",
      route: (id: number) => `/patient/${id}/evolution`,
      activeMatch: (path: string, id: number) => path === `/patient/${id}/evolution`,
    }
  ]
};
