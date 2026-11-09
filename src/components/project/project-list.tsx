"use client";

// ==============================================================================
// CONSTRUCT360 PROJECT PORTFOLIO LIST & CREATION
// Enterprise Construction Projects, Budgets, Health & Progress Directory
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  FolderGit2,
  Building2,
  Calendar,
  IndianRupee,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  X,
  RefreshCw,
  HardHat,
  ShieldAlert,
} from "lucide-react";

interface ProjectItem {
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
  assignedSiteIds: string[];
  assignedEmployeeIds: string[];
  assignedLabourerIds: string[];
}

export default function ProjectList({
  onSelectProject,
}: {
  onSelectProject: (projectId: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientName: "",
    clientContactPerson: "",
    clientEmail: "",
    clientPhone: "",
    contractValue: "",
    budget: "",
    startDate: new Date().toISOString().split("T")[0],
    plannedEndDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
  });

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/v1/projects?limit=50";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (healthFilter !== "ALL") url += `&healthStatus=${healthFilter}`;

      const res = await fetch(url, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setProjects(json.data);
      } else {
        setError(json.error?.message || "Failed to load projects");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, healthFilter]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        clientName: form.clientName.trim(),
        clientContactPerson: form.clientContactPerson.trim() || undefined,
        clientEmail: form.clientEmail.trim() || undefined,
        clientPhone: form.clientPhone.trim() || undefined,
        contractValue: Number(form.contractValue) || 0,
        budget: Number(form.budget) || 0,
        startDate: form.startDate,
        plannedEndDate: form.plannedEndDate,
      };

      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setShowCreateModal(false);
        setForm({
          name: "",
          description: "",
          clientName: "",
          clientContactPerson: "",
          clientEmail: "",
          clientPhone: "",
          contractValue: "",
          budget: "",
          startDate: new Date().toISOString().split("T")[0],
          plannedEndDate: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
        });
        await fetchProjects();
        onSelectProject(json.data.id);
      } else {
        alert(json.error?.message || "Failed to create project");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating project");
    } finally {
      setSubmitting(false);
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

  const getHealthBadge = (health: ProjectItem["healthStatus"]) => {
    switch (health) {
      case "ON_TRACK":
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            ON TRACK
          </span>
        );
      case "AT_RISK":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <AlertTriangle className="h-3 w-3" />
            AT RISK
          </span>
        );
      case "DELAYED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            <ShieldAlert className="h-3 w-3" />
            DELAYED
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ProjectItem["status"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-800">
            ACTIVE
          </span>
        );
      case "PLANNING":
        return (
          <span className="rounded bg-stone/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
            PLANNING
          </span>
        );
      case "COMPLETED":
        return (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-800">
            COMPLETED
          </span>
        );
      case "ON_HOLD":
        return (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
            ON HOLD
          </span>
        );
      default:
        return (
          <span className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-accent" />
            Project Portfolio & Planning Command
          </h1>
          <p className="text-xs text-muted mt-1">
            Enterprise WBS scheduling, milestone tracking, BOQ progress execution, and financial performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProjects()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-canvas shadow-xs hover:bg-ink/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Construction Project
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by project name, PRJ code, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-panel pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted text-[11px] font-medium flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filters:
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
          >
            <option value="ALL">All Health Ratings</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="DELAYED">Delayed</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
          <p className="text-xs font-medium text-muted">Loading project portfolio...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel/50 p-12 text-center">
          <FolderGit2 className="mx-auto h-8 w-8 text-muted/60" />
          <h3 className="mt-2 text-sm font-semibold text-ink">No Projects Found</h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            No projects match the current search filters. Create a new construction project to initialize WBS planning.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="rounded-lg border border-line bg-panel p-5 shadow-xs hover:border-accent/60 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1.5 py-0.5 rounded">
                      {proj.projectCode}
                    </span>
                    <h3 className="mt-1.5 text-sm font-bold text-ink leading-tight">
                      {proj.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getHealthBadge(proj.healthStatus)}
                    {getStatusBadge(proj.status)}
                  </div>
                </div>

                {/* Client & Description */}
                <div className="mt-2 text-xs text-muted">
                  <div className="flex items-center gap-1.5 text-ink font-medium">
                    <Building2 className="h-3.5 w-3.5 text-accent" />
                    <span>{proj.clientName}</span>
                  </div>
                  {proj.description && (
                    <p className="mt-1 text-[11px] line-clamp-2 text-muted leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted block">
                      Approved Budget
                    </span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(proj.budget)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted block">
                      Contract Value
                    </span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(proj.contractValue)}
                    </span>
                  </div>
                </div>

                {/* Timeline & Progress Bar */}
                <div className="mt-3 border-t border-line/60 pt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[11px] font-medium text-muted flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-accent" /> Progress
                    </span>
                    <span className="font-bold text-ink text-xs">
                      {proj.overallProgressPercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        proj.healthStatus === "DELAYED"
                          ? "bg-rose-500"
                          : proj.healthStatus === "AT_RISK"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, proj.overallProgressPercent))}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(proj.startDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span>
                      Target:{" "}
                      {new Date(proj.plannedEndDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectProject(proj.id)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-2 text-xs font-bold text-ink shadow-2xs hover:bg-ink hover:text-canvas transition-colors"
              >
                <span>Command Center & WBS</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create New Construction Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg border border-line bg-panel p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-accent" />
                <h2 className="text-base font-bold text-ink">
                  Initialize New Construction Project
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline IT Park Phase 2"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Client Organization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Developers Ltd"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Client Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Arvind Mehta (VP Infra)"
                    value={form.clientContactPerson}
                    onChange={(e) => setForm({ ...form, clientContactPerson: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Client Email
                  </label>
                  <input
                    type="email"
                    placeholder="contact@client.com"
                    value={form.clientEmail}
                    onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Client Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.clientPhone}
                    onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Approved Project Budget (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 850000000"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Contract Value (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 920000000"
                    value={form.contractValue}
                    onChange={(e) => setForm({ ...form, contractValue: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">
                    Planned Completion Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.plannedEndDate}
                    onChange={(e) => setForm({ ...form, plannedEndDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-ink">
                    Project Scope & Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detailed project summary, engineering specifications, total built-up area..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Creating Project..." : "Create & Launch Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
