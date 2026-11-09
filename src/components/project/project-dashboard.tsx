"use client";

// ==============================================================================
// CONSTRUCT360 EXECUTIVE PROJECT DASHBOARD COMMAND CENTER
// Unified Command Center: Overview, WBS Gantt, BOQ Verification, Financials & Docs
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  FolderGit2,
  Building2,
  Calendar,
  IndianRupee,
  Users,
  HardHat,
  ListTree,
  Ruler,
  Receipt,
  FileText,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  Upload,
  Download,
  FileCheck2,
  TrendingUp,
  MapPin,
  X,
} from "lucide-react";
import WbsGanttPlanner from "./wbs-gantt-planner";
import ProgressMeasurement from "./progress-measurement";
import ProjectFinancials from "./project-financials";

interface DashboardData {
  project: {
    id: string;
    projectCode: string;
    name: string;
    description?: string;
    clientName: string;
    clientContactPerson?: string;
    clientEmail?: string;
    clientPhone?: string;
    contractValue: number;
    budget: number;
    status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
    healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED";
    startDate: string;
    plannedEndDate: string;
    overallProgressPercent: number;
  };
  projectManager?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  overallProgressPercent: number;
  healthStatus: "ON_TRACK" | "AT_RISK" | "DELAYED";
  schedule: {
    startDate: string;
    plannedEndDate: string;
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    timelinePercent: number;
    milestonesTotal: number;
    milestonesAchieved: number;
    delayedTasksCount: number;
  };
  financials: {
    approvedBudget: number;
    contractValue: number;
    totalActualExpenses: number;
    labourCost: number;
    materialCost: number;
    equipmentCost: number;
    contractorCost: number;
    overheadCost: number;
    remainingBudget: number;
    budgetVarianceAmount: number;
    budgetVariancePercent: number;
    costOverrunRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  };
  workforce: {
    assignedSitesCount: number;
    assignedEngineersCount: number;
    assignedLabourersCount: number;
    activeContractorsCount: number;
    totalMusterDeployed: number;
  };
  progressActivitiesSummary: {
    totalActivities: number;
    inExecutionCount: number;
    completedCount: number;
    averageExecutionPercent: number;
  };
  pendingApprovalsCount: {
    measurementLogs: number;
    openDelays: number;
    total: number;
  };
  recentActivities: any[];
  recentMeasurements: any[];
  recentDelays: any[];
}

interface ProjectDoc {
  id: string;
  projectId: string;
  documentType: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes?: number;
  version?: string;
  createdAt: string;
}

export default function ProjectDashboard({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "wbs" | "progress" | "financials" | "documents"
  >("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [documents, setDocuments] = useState<ProjectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Document upload modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    documentType: "ARCHITECTURAL_DRAWING" as const,
    title: "",
    fileName: "",
    fileUrl: "",
    fileSizeBytes: 2048576,
    version: "v1.0",
  });
  const [submittingDoc, setSubmittingDoc] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/dashboard`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load project dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading project");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDashboard();
    fetchDocuments();
  }, [projectId]);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDoc(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          documentType: docForm.documentType,
          title: docForm.title.trim(),
          fileName: docForm.fileName.trim(),
          fileUrl: docForm.fileUrl.trim() || "/docs/sample-blueprint.pdf",
          fileSizeBytes: Number(docForm.fileSizeBytes) || 1024000,
          version: docForm.version.trim() || "v1.0",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowDocModal(false);
        setDocForm({
          documentType: "ARCHITECTURAL_DRAWING",
          title: "",
          fileName: "",
          fileUrl: "",
          fileSizeBytes: 2048576,
          version: "v1.0",
        });
        await fetchDocuments();
      } else {
        alert(json.error?.message || "Failed to attach document");
      }
    } catch (err: any) {
      alert(err?.message || "Error uploading document");
    } finally {
      setSubmittingDoc(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs font-medium text-muted">Aggregating project command analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50/50 p-6 text-sm text-red-800">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Error Loading Project
        </div>
        <p className="mt-1 text-xs text-red-700">{error || "No data returned"}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink"
        >
          Back to Portfolio
        </button>
      </div>
    );
  }

  const { project, schedule, financials, workforce, progressActivitiesSummary, pendingApprovalsCount } = data;

  return (
    <div className="space-y-6">
      {/* Top Identity Header Card */}
      <div className="rounded-lg border border-line bg-panel p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onBack}
              className="mt-0.5 rounded-md border border-line p-1.5 hover:bg-stone/40 text-muted hover:text-ink transition-colors"
              title="Return to Portfolio Directory"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent bg-stone/40 px-2 py-0.5 rounded">
                  {project.projectCode}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    project.healthStatus === "ON_TRACK"
                      ? "bg-emerald-100 text-emerald-800"
                      : project.healthStatus === "AT_RISK"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {project.healthStatus}
                </span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-800">
                  {project.status}
                </span>
              </div>

              <h1 className="mt-1 text-lg font-bold text-ink">{project.name}</h1>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1 text-ink font-medium">
                  <Building2 className="h-3.5 w-3.5 text-accent" />
                  {project.clientName}
                </span>
                {data.projectManager && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-accent" />
                    PM: {data.projectManager.name} ({data.projectManager.phone})
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  {new Date(project.startDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  &rarr;{" "}
                  {new Date(project.plannedEndDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Right */}
          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-line/70 pt-3 md:pt-0 md:pl-6 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted block">Budget</span>
              <span className="text-sm font-bold text-ink block">
                {formatCurrency(project.budget)}
              </span>
              <span className="text-[10px] text-muted">
                Spent: {formatCurrency(financials.totalActualExpenses)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted block">Overall Progress</span>
              <span className="text-sm font-bold text-emerald-700 block">
                {project.overallProgressPercent}%
              </span>
              <span className="text-[10px] text-muted">
                Schedule: {schedule.timelinePercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 pt-3 border-t border-line/60">
          <div className="flex items-center justify-between text-[11px] text-muted mb-1">
            <span>Physical Execution Completion</span>
            <span className="font-bold text-ink font-mono">{project.overallProgressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, Math.max(0, project.overallProgressPercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-line flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-accent text-ink font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <FolderGit2 className="h-3.5 w-3.5 text-accent" />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveTab("wbs")}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors ${
            activeTab === "wbs"
              ? "border-accent text-ink font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <ListTree className="h-3.5 w-3.5 text-accent" />
          WBS & Gantt Planner
        </button>

        <button
          onClick={() => setActiveTab("progress")}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors ${
            activeTab === "progress"
              ? "border-accent text-ink font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Ruler className="h-3.5 w-3.5 text-accent" />
          Field Progress & Verification ({pendingApprovalsCount.measurementLogs} Pending)
        </button>

        <button
          onClick={() => setActiveTab("financials")}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors ${
            activeTab === "financials"
              ? "border-accent text-ink font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <IndianRupee className="h-3.5 w-3.5 text-accent" />
          Financial Ledger & Variance
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 transition-colors ${
            activeTab === "documents"
              ? "border-accent text-ink font-bold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-accent" />
          Blueprints & Documents ({documents.length})
        </button>
      </div>

      {/* Tab 1: Executive Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Overdue Alert Banner if any */}
          {schedule.delayedTasksCount > 0 && (
            <div className="rounded-lg border border-rose-300 bg-rose-50/70 p-4 text-xs text-rose-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="h-4 w-4 text-rose-700" />
                Schedule Warning: {schedule.delayedTasksCount} Overdue Task(s) Requiring Expedited Recovery
              </div>
              <p className="mt-1 font-medium">
                Target dates have passed on active work items. Review WBS Gantt planner to assign additional manpower or adjust sequence.
              </p>
            </div>
          )}

          {/* KPI Matrix Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Schedule Velocity
              </span>
              <span className="text-lg font-bold text-ink mt-1 block">
                {schedule.daysElapsed} / {schedule.totalDays} Days
              </span>
              <span className="text-[11px] text-muted">
                {schedule.daysRemaining} calendar days remaining
              </span>
            </div>

            <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Workforce Deployed
              </span>
              <span className="text-lg font-bold text-ink mt-1 block">
                {workforce.assignedEngineersCount} Eng / {workforce.assignedLabourersCount} Labour
              </span>
              <span className="text-[11px] text-muted">
                Across {workforce.assignedSitesCount} authorized sites
              </span>
            </div>

            <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-muted block">
                BOQ Progress Scope
              </span>
              <span className="text-lg font-bold text-ink mt-1 block">
                {progressActivitiesSummary.completedCount} / {progressActivitiesSummary.totalActivities} Completed
              </span>
              <span className="text-[11px] text-muted">
                {progressActivitiesSummary.inExecutionCount} actively executing
              </span>
            </div>

            <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Financial Variance
              </span>
              <span className="text-lg font-bold text-emerald-700 mt-1 block">
                {financials.budgetVariancePercent}% Variance
              </span>
              <span className="text-[11px] text-muted">
                Remaining: {formatCurrency(financials.remainingBudget)}
              </span>
            </div>
          </div>

          {/* Key Milestones & Pending Approvals Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-line bg-panel p-5 shadow-xs">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Milestone Tracking
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Milestones Achieved:</span>
                <span className="font-bold text-ink font-mono">
                  {schedule.milestonesAchieved} / {schedule.milestonesTotal}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-stone/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${
                      schedule.milestonesTotal > 0
                        ? (schedule.milestonesAchieved / schedule.milestonesTotal) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panel p-5 shadow-xs">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                Pending Approvals & Verification Gates
              </h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Field Measurement Approvals:</span>
                <span className="font-bold text-amber-700 font-mono">
                  {pendingApprovalsCount.measurementLogs} Pending
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-muted">Unresolved Delay Records:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {pendingApprovalsCount.openDelays} Open
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WBS & Gantt */}
      {activeTab === "wbs" && <WbsGanttPlanner projectId={projectId} />}

      {/* Tab 3: Field Progress */}
      {activeTab === "progress" && <ProgressMeasurement projectId={projectId} />}

      {/* Tab 4: Financials */}
      {activeTab === "financials" && <ProjectFinancials projectId={projectId} />}

      {/* Tab 5: Documents */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Project Engineering Blueprints, Specifications & Permits
              </h3>
              <p className="text-xs text-muted">
                Authoritative repository for Architectural, Structural, MEP, and statutory clearance docs
              </p>
            </div>
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Project Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents.length === 0 ? (
              <div className="col-span-full rounded-lg border border-dashed border-line bg-panel/50 p-8 text-center text-muted text-xs">
                No documents uploaded. Click &quot;Upload Project Document&quot; to attach drawings or contracts.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-line bg-panel p-4 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">
                        {doc.documentType}
                      </span>
                      <span className="font-mono text-[10px] text-muted">{doc.version || "v1.0"}</span>
                    </div>

                    <h4 className="mt-2 text-xs font-bold text-ink leading-snug">{doc.title}</h4>
                    <p className="mt-1 font-mono text-[10px] text-muted truncate">{doc.fileName}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-[11px] text-muted">
                    <span>
                      {doc.fileSizeBytes
                        ? `${(doc.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`
                        : "PDF"}
                    </span>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-bold text-accent hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal: Upload Document */}
          {showDocModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Upload className="h-4 w-4 text-accent" />
                    Attach Project Engineering Document
                  </h3>
                  <button onClick={() => setShowDocModal(false)} className="text-muted hover:text-ink">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleUploadDoc} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink">Document Category *</label>
                    <select
                      value={docForm.documentType}
                      onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value as any })}
                      className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                    >
                      <option value="ARCHITECTURAL_DRAWING">Architectural Drawing</option>
                      <option value="STRUCTURAL_DESIGN">Structural Design Calculation</option>
                      <option value="CONTRACT">Contract Agreement</option>
                      <option value="BOQ">BOQ Specification</option>
                      <option value="SITE_PERMIT">Municipal Site Permit / NOC</option>
                      <option value="SAFETY_PLAN">Site Safety & Hazard Plan</option>
                      <option value="PROGRESS_REPORT">Progress Report</option>
                      <option value="OTHER">Other Technical Specification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Document Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Raft Rebar Detail Layout - Grid A1-D8"
                      value={docForm.title}
                      onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                      className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink">File Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="DWG-STR-RFT-001.dwg"
                        value={docForm.fileName}
                        onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
                        className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink">Version</label>
                      <input
                        type="text"
                        placeholder="v1.2"
                        value={docForm.version}
                        onChange={(e) => setDocForm({ ...docForm, version: e.target.value })}
                        className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">File Storage URL</label>
                    <input
                      type="text"
                      placeholder="https://storage.construct360.internal/..."
                      value={docForm.fileUrl}
                      onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                      className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                    <button
                      type="button"
                      onClick={() => setShowDocModal(false)}
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDoc}
                      className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                    >
                      {submittingDoc ? "Uploading..." : "Save Document"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
