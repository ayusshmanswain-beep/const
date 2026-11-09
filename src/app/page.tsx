"use client";

// ==============================================================================
// CONSTRUCT360 ENTERPRISE WORKFORCE & GEOSPATIAL COMMAND CONSOLE
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  MapPin,
  ShieldCheck,
  UserCheck,
  Building2,
  Users,
  Compass,
  HardHat,
  Briefcase,
  UserCircle,
  LayoutDashboard,
  FolderGit2,
  ListTree,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import SitesManager from "@/components/admin/sites-manager";
import AttendanceDashboard from "@/components/admin/attendance-dashboard";
import EmployeePunchPortal from "@/components/employee/punch-portal";
import WorkforceDashboard from "@/components/workforce/workforce-dashboard";
import EmployeeManager from "@/components/workforce/employee-manager";
import LabourManager from "@/components/workforce/labour-manager";
import ContractorManager from "@/components/workforce/contractor-manager";
import EmployeePortal from "@/components/workforce/employee-portal";
import ProjectList from "@/components/project/project-list";
import ProjectDashboard from "@/components/project/project-dashboard";

type ActiveTabType =
  | "projects"
  | "project-command"
  | "workforce-dashboard"
  | "employees"
  | "labourers"
  | "contractors"
  | "portal"
  | "employee"
  | "sites"
  | "dashboard";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("a0000001-0000-0000-0000-000000000001");
  const [currentRole, setCurrentRole] = useState<"engineer" | "admin">("admin");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Initialize session on load
  const switchRole = async (targetRole: "engineer" | "admin") => {
    setIsSwitching(true);
    try {
      const res = await fetch("/api/v1/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentUser(json.data.user);
        setCurrentRole(targetRole);
      }
    } catch {
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    switchRole("admin");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-panel/90 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <div className="hidden md:flex items-center gap-2 border-l border-line pl-4 text-xs">
              <Building2 className="h-3.5 w-3.5 text-muted" />
              <span className="font-semibold text-ink">Apex Infrastructure Projects Ltd</span>
              <span className="rounded bg-stone/50 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                APEX-INFR
              </span>
            </div>
          </div>

          {/* Quick Role & Identity Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-md border border-line bg-canvas p-0.5 text-xs">
              <button
                onClick={() => {
                  switchRole("engineer");
                  setActiveTab("portal");
                }}
                disabled={isSwitching}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all ${
                  currentRole === "engineer"
                    ? "bg-ink text-canvas shadow-xs font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-accent" />
                Vikram (Site Engineer)
              </button>
              <button
                onClick={() => {
                  switchRole("admin");
                  setActiveTab("workforce-dashboard");
                }}
                disabled={isSwitching}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all ${
                  currentRole === "admin"
                    ? "bg-ink text-canvas shadow-xs font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Rajesh (VP / Admin)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Navigation Bar */}
      <nav className="border-b border-line bg-panel overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 text-xs font-medium whitespace-nowrap">
          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "projects"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5 text-accent" />
            Project Portfolio
          </button>

          <button
            onClick={() => setActiveTab("project-command")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "project-command"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <ListTree className="h-3.5 w-3.5 text-accent" />
            Project Command & WBS
          </button>

          <div className="h-4 w-px bg-line mx-1" />

          <button
            onClick={() => setActiveTab("workforce-dashboard")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "workforce-dashboard"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
            Workforce Command
          </button>

          <button
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "employees"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-accent" />
            Employees & Staff
          </button>

          <button
            onClick={() => setActiveTab("labourers")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "labourers"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <HardHat className="h-3.5 w-3.5 text-accent" />
            Daily Labour & Gangs
          </button>

          <button
            onClick={() => setActiveTab("contractors")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "contractors"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 text-accent" />
            Contractors & RA Bills
          </button>

          <button
            onClick={() => setActiveTab("portal")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "portal"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <UserCircle className="h-3.5 w-3.5 text-accent" />
            Self-Service Portal
          </button>

          <div className="h-4 w-px bg-line mx-1" />

          <button
            onClick={() => setActiveTab("employee")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "employee"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            GPS Attendance Punch
          </button>

          <button
            onClick={() => setActiveTab("sites")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "sites"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Sites & Geofences
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors ${
              activeTab === "dashboard"
                ? "border-accent text-ink font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Attendance Verification
          </button>
        </div>
      </nav>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === "projects" && (
          <ProjectList
            onSelectProject={(id) => {
              setSelectedProjectId(id);
              setActiveTab("project-command");
            }}
          />
        )}
        {activeTab === "project-command" && (
          <ProjectDashboard
            projectId={selectedProjectId}
            onBack={() => setActiveTab("projects")}
          />
        )}
        {activeTab === "workforce-dashboard" && (
          <WorkforceDashboard onNavigateTab={(tab) => setActiveTab(tab as ActiveTabType)} />
        )}
        {activeTab === "employees" && <EmployeeManager />}
        {activeTab === "labourers" && <LabourManager />}
        {activeTab === "contractors" && <ContractorManager />}
        {activeTab === "portal" && <EmployeePortal />}
        {activeTab === "employee" && <EmployeePunchPortal />}
        {activeTab === "sites" && <SitesManager />}
        {activeTab === "dashboard" && <AttendanceDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-panel py-3 text-center text-[11px] text-muted">
        CONSTRUCT360 Enterprise Workforce Management &bull; WGS-84 PostGIS Spatial Engine
        &bull; Multi-Tenant Construction Infrastructure
      </footer>
    </div>
  );
}
