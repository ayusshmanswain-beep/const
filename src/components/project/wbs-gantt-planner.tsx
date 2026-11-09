"use client";

// ==============================================================================
// CONSTRUCT360 WORK BREAKDOWN STRUCTURE (WBS) & GANTT PLANNER
// Hierarchical Work Packages, Task Schedules, Predecessors & Critical Milestones
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  ListTree,
  Calendar,
  Clock,
  Plus,
  GitBranch,
  Link2,
  CheckCircle2,
  AlertCircle,
  Flag,
  User,
  Building,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Sliders,
  X,
} from "lucide-react";

interface TaskWithDeps {
  id: string;
  projectId: string;
  wbsNodeId?: string;
  taskCode: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  completionPercent: number;
  isMilestone: boolean;
  milestoneTitle?: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  plannedManHours: number;
  actualManHours?: number;
  predecessors: Array<{
    dependencyId: string;
    predecessorTaskId: string;
    predecessorCode: string;
    predecessorTitle: string;
    dependencyType: string;
    lagDays: number;
  }>;
  assignedEmployees: Array<{
    id: string;
    name: string;
    employeeCode: string;
    designation?: string;
  }>;
}

interface WbsNodeTree {
  id: string;
  projectId: string;
  wbsCode: string;
  name: string;
  description?: string;
  parentWbsId?: string;
  orderIndex: number;
  tasks: TaskWithDeps[];
  children?: WbsNodeTree[];
}

export default function WbsGanttPlanner({ projectId }: { projectId: string }) {
  const [wbsTree, setWbsTree] = useState<WbsNodeTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded WBS packages map
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modals
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddDepModal, setShowAddDepModal] = useState(false);
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<TaskWithDeps | null>(null);

  // Forms
  const [packageForm, setPackageForm] = useState({
    wbsCode: "",
    name: "",
    description: "",
    parentWbsId: "",
  });

  const [taskForm, setTaskForm] = useState({
    wbsNodeId: "",
    title: "",
    description: "",
    priority: "MEDIUM" as const,
    isMilestone: false,
    milestoneTitle: "",
    plannedStartDate: new Date().toISOString().split("T")[0],
    plannedEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    plannedManHours: 80,
  });

  const [depForm, setDepForm] = useState({
    taskId: "",
    predecessorTaskId: "",
    dependencyType: "FINISH_TO_START" as const,
    lagDays: 0,
  });

  const [updateForm, setUpdateForm] = useState({
    completionPercent: 0,
    status: "IN_PROGRESS" as "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED",
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchWbs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/wbs`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWbsTree(json.data);
        // Default expand all root nodes
        const exp: Record<string, boolean> = {};
        json.data.forEach((n: WbsNodeTree) => {
          exp[n.id] = true;
          if (n.children) {
            n.children.forEach((c) => {
              exp[c.id] = true;
            });
          }
        });
        setExpandedNodes(exp);
      } else {
        setError(json.error?.message || "Failed to load WBS");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading WBS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWbs();
  }, [projectId]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Collect all tasks flat for dropdowns and Gantt
  const allTasks: TaskWithDeps[] = [];
  const allNodes: Array<{ id: string; wbsCode: string; name: string }> = [];

  const traverseNodes = (nodes: WbsNodeTree[]) => {
    for (const n of nodes) {
      allNodes.push({ id: n.id, wbsCode: n.wbsCode, name: n.name });
      if (n.tasks) allTasks.push(...n.tasks);
      if (n.children) traverseNodes(n.children);
    }
  };
  traverseNodes(wbsTree);

  // Compute Gantt date boundary
  let earliestDate = Date.now();
  let latestDate = Date.now() + 30 * 86400000;
  if (allTasks.length > 0) {
    const startDates = allTasks.map((t) => new Date(t.plannedStartDate).getTime());
    const endDates = allTasks.map((t) => new Date(t.plannedEndDate).getTime());
    earliestDate = Math.min(...startDates);
    latestDate = Math.max(...endDates);
  }
  const totalDurationDays = Math.max(1, Math.round((latestDate - earliestDate) / 86400000));

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/wbs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          wbsCode: packageForm.wbsCode.trim(),
          name: packageForm.name.trim(),
          description: packageForm.description.trim() || undefined,
          parentWbsId: packageForm.parentWbsId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddPackageModal(false);
        setPackageForm({ wbsCode: "", name: "", description: "", parentWbsId: "" });
        await fetchWbs();
      } else {
        alert(json.error?.message || "Failed to create WBS node");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating WBS node");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          wbsNodeId: taskForm.wbsNodeId,
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          priority: taskForm.priority,
          isMilestone: taskForm.isMilestone,
          milestoneTitle: taskForm.isMilestone ? taskForm.milestoneTitle.trim() : undefined,
          plannedStartDate: taskForm.plannedStartDate,
          plannedEndDate: taskForm.plannedEndDate,
          plannedManHours: Number(taskForm.plannedManHours) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddTaskModal(false);
        setTaskForm({
          wbsNodeId: "",
          title: "",
          description: "",
          priority: "MEDIUM",
          isMilestone: false,
          milestoneTitle: "",
          plannedStartDate: new Date().toISOString().split("T")[0],
          plannedEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
          plannedManHours: 80,
        });
        await fetchWbs();
      } else {
        alert(json.error?.message || "Failed to create task");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/tasks/${depForm.taskId}/dependencies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
          body: JSON.stringify({
            predecessorTaskId: depForm.predecessorTaskId,
            dependencyType: depForm.dependencyType,
            lagDays: Number(depForm.lagDays) || 0,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setShowAddDepModal(false);
        setDepForm({ taskId: "", predecessorTaskId: "", dependencyType: "FINISH_TO_START", lagDays: 0 });
        await fetchWbs();
      } else {
        alert(json.error?.message || "Dependency link rejected (e.g. cycle prevention)");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating dependency link");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForUpdate) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/tasks/${selectedTaskForUpdate.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
          body: JSON.stringify({
            completionPercent: Number(updateForm.completionPercent),
            status: updateForm.status,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setSelectedTaskForUpdate(null);
        await fetchWbs();
      } else {
        alert(json.error?.message || "Failed to update task progress");
      }
    } catch (err: any) {
      alert(err?.message || "Error updating task");
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: TaskWithDeps["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">CRITICAL</span>;
      case "HIGH":
        return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">HIGH</span>;
      case "MEDIUM":
        return <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800">MED</span>;
      default:
        return <span className="rounded bg-stone/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted">LOW</span>;
    }
  };

  const getStatusBadge = (status: TaskWithDeps["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">COMPLETED</span>;
      case "IN_PROGRESS":
        return <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">IN PROGRESS</span>;
      case "BLOCKED":
        return <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">BLOCKED</span>;
      default:
        return <span className="rounded bg-stone/50 px-1.5 py-0.5 text-[9px] font-semibold text-muted">NOT STARTED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <ListTree className="h-4 w-4 text-accent" />
            Hierarchical Work Breakdown Structure (WBS) & Gantt Engine
          </h2>
          <p className="text-xs text-muted">
            Manage work packages, sequencing, dependency graphs with DFS cycle detection, and milestones
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchWbs()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync WBS
          </button>
          <button
            onClick={() => setShowAddPackageModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
          >
            <Layers className="h-3.5 w-3.5 text-accent" />
            + WBS Package
          </button>
          <button
            onClick={() => setShowAddDepModal(true)}
            disabled={allTasks.length < 2}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40 disabled:opacity-50"
          >
            <Link2 className="h-3.5 w-3.5 text-accent" />
            Link Dependencies
          </button>
          <button
            onClick={() => setShowAddTaskModal(true)}
            disabled={allNodes.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            + Task / Milestone
          </button>
        </div>
      </div>

      {loading && wbsTree.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
          <p className="text-xs font-medium text-muted">Building WBS tree & dependency graph...</p>
        </div>
      ) : wbsTree.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-panel/50 p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted/60" />
          <h3 className="mt-2 text-sm font-semibold text-ink">No WBS Packages Defined</h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            Initialize your project hierarchy by adding Level 1 WBS packages (e.g. 1.0 Substructure, 2.0 Superstructure).
          </p>
          <button
            onClick={() => setShowAddPackageModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-canvas"
          >
            <Plus className="h-3.5 w-3.5" />
            Create First WBS Package
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Gantt Timeline Strip Overview */}
          <div className="rounded-lg border border-line bg-panel p-4 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between pb-2 border-b border-line text-xs font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                Gantt Timeline Visualization ({allTasks.length} Scheduled Tasks)
              </span>
              <div className="flex items-center gap-3 text-[11px] font-normal text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical Priority
                </span>
                <span className="flex items-center gap-1">
                  <Flag className="h-3 w-3 text-amber-500" /> Key Milestone
                </span>
              </div>
            </div>

            {/* Gantt Bars Table */}
            <div className="mt-3 min-w-[700px] space-y-2">
              {allTasks.map((task) => {
                const taskStart = new Date(task.plannedStartDate).getTime();
                const taskEnd = new Date(task.plannedEndDate).getTime();
                const leftPercent = Math.max(0, Math.min(95, ((taskStart - earliestDate) / (latestDate - earliestDate)) * 100));
                const widthPercent = Math.max(5, Math.min(100 - leftPercent, ((taskEnd - taskStart) / (latestDate - earliestDate)) * 100));

                return (
                  <div key={task.id} className="flex items-center gap-3 text-xs">
                    <div className="w-48 shrink-0 truncate">
                      <span className="font-mono text-[10px] text-accent mr-1">
                        {task.taskCode}
                      </span>
                      <span className="font-medium text-ink">{task.title}</span>
                    </div>

                    <div className="relative flex-1 h-6 bg-canvas rounded border border-line/50 overflow-hidden">
                      <div
                        className={`absolute top-0.5 bottom-0.5 rounded px-2 flex items-center justify-between text-[10px] font-bold text-white shadow-2xs transition-all ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-600"
                            : task.priority === "CRITICAL"
                            ? "bg-rose-600"
                            : "bg-sky-600"
                        }`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      >
                        <span className="truncate pr-1">
                          {task.isMilestone ? `★ ${task.milestoneTitle || task.title}` : `${task.completionPercent}%`}
                        </span>
                        {task.isMilestone && <Flag className="h-3 w-3 shrink-0 text-amber-300" />}
                      </div>
                    </div>

                    <div className="w-20 text-right text-[10px] font-mono text-muted shrink-0">
                      {new Date(task.plannedEndDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hierarchical WBS Tree Table */}
          <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
            <div className="bg-canvas px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-bold text-ink">
              <span>WBS Node & Task Hierarchy</span>
              <span>Priority / Status / Actions</span>
            </div>

            <div className="divide-y divide-line/60">
              {wbsTree.map((rootNode) => (
                <div key={rootNode.id} className="text-xs">
                  {/* Root WBS Header */}
                  <div
                    onClick={() => toggleExpand(rootNode.id)}
                    className="flex items-center justify-between px-4 py-2.5 bg-stone/30 hover:bg-stone/50 cursor-pointer font-bold text-ink transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedNodes[rootNode.id] ? (
                        <ChevronDown className="h-4 w-4 text-accent" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted" />
                      )}
                      <span className="font-mono text-accent">{rootNode.wbsCode}</span>
                      <span>{rootNode.name}</span>
                      <span className="text-[11px] font-normal text-muted">
                        ({rootNode.tasks.length} tasks)
                      </span>
                    </div>

                    <span className="text-[10px] uppercase font-semibold text-muted bg-panel px-2 py-0.5 rounded border border-line">
                      Package
                    </span>
                  </div>

                  {/* Tasks under Root Node */}
                  {expandedNodes[rootNode.id] && rootNode.tasks.length > 0 && (
                    <div className="divide-y divide-line/40 pl-6 bg-panel">
                      {rootNode.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-canvas transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1 rounded">
                              {task.taskCode}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">{task.title}</span>
                                {task.isMilestone && (
                                  <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                    <Flag className="h-2.5 w-2.5" /> MILESTONE
                                  </span>
                                )}
                              </div>

                              {/* Dependencies metadata */}
                              {task.predecessors.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted">
                                  <Link2 className="h-3 w-3 text-accent" />
                                  <span>
                                    Predecessors:{" "}
                                    {task.predecessors
                                      .map((p) => `${p.predecessorCode} (${p.dependencyType})`)
                                      .join(", ")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {getPriorityBadge(task.priority)}
                            {getStatusBadge(task.status)}

                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-ink">
                                {task.completionPercent}%
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedTaskForUpdate(task);
                                  setUpdateForm({
                                    completionPercent: task.completionPercent,
                                    status: task.status,
                                  });
                                }}
                                className="p-1 rounded hover:bg-stone/50 text-muted hover:text-ink"
                                title="Update Progress & Status"
                              >
                                <Sliders className="h-3.5 w-3.5 text-accent" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Child WBS Packages */}
                  {expandedNodes[rootNode.id] &&
                    rootNode.children &&
                    rootNode.children.map((childNode) => (
                      <div key={childNode.id} className="border-t border-line/40 pl-6">
                        <div
                          onClick={() => toggleExpand(childNode.id)}
                          className="flex items-center justify-between px-4 py-2 bg-stone/20 hover:bg-stone/40 cursor-pointer font-semibold text-ink"
                        >
                          <div className="flex items-center gap-2">
                            {expandedNodes[childNode.id] ? (
                              <ChevronDown className="h-3.5 w-3.5 text-accent" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted" />
                            )}
                            <span className="font-mono text-accent">{childNode.wbsCode}</span>
                            <span>{childNode.name}</span>
                            <span className="text-[10px] font-normal text-muted">
                              ({childNode.tasks.length} tasks)
                            </span>
                          </div>

                          <span className="text-[9px] uppercase font-semibold text-muted bg-panel px-1.5 py-0.5 rounded border border-line">
                            Sub-Package
                          </span>
                        </div>

                        {expandedNodes[childNode.id] && childNode.tasks.length > 0 && (
                          <div className="divide-y divide-line/40 pl-6 bg-panel">
                            {childNode.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between px-4 py-2 hover:bg-canvas transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1 rounded">
                                    {task.taskCode}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-ink">{task.title}</span>
                                      {task.isMilestone && (
                                        <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                          <Flag className="h-2.5 w-2.5" /> MILESTONE
                                        </span>
                                      )}
                                    </div>
                                    {task.predecessors.length > 0 && (
                                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted">
                                        <Link2 className="h-3 w-3 text-accent" />
                                        <span>
                                          Predecessors:{" "}
                                          {task.predecessors
                                            .map((p) => `${p.predecessorCode} (${p.dependencyType})`)
                                            .join(", ")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {getPriorityBadge(task.priority)}
                                  {getStatusBadge(task.status)}
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[11px] font-bold text-ink">
                                      {task.completionPercent}%
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedTaskForUpdate(task);
                                        setUpdateForm({
                                          completionPercent: task.completionPercent,
                                          status: task.status,
                                        });
                                      }}
                                      className="p-1 rounded hover:bg-stone/50 text-muted hover:text-ink"
                                    >
                                      <Sliders className="h-3.5 w-3.5 text-accent" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create WBS Package */}
      {showAddPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                Add WBS Package
              </h3>
              <button onClick={() => setShowAddPackageModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">WBS Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.0 or 2.1"
                  value={packageForm.wbsCode}
                  onChange={(e) => setPackageForm({ ...packageForm, wbsCode: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Package Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substructure Works"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Parent WBS Package (Optional)</label>
                <select
                  value={packageForm.parentWbsId}
                  onChange={(e) => setPackageForm({ ...packageForm, parentWbsId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="">None (Root Level 1 Package)</option>
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.wbsCode} - {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPackageModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add WBS Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Task / Milestone */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" />
                Schedule New Task or Milestone
              </h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Parent WBS Node *</label>
                <select
                  required
                  value={taskForm.wbsNodeId}
                  onChange={(e) => setTaskForm({ ...taskForm, wbsNodeId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="">Select WBS Node</option>
                  {allNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.wbsCode} - {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft Foundation Concrete Pouring"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Planned Man-Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={taskForm.plannedManHours}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedManHours: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.plannedStartDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">End Date *</label>
                  <input
                    type="date"
                    required
                    value={taskForm.plannedEndDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isMilestone"
                  checked={taskForm.isMilestone}
                  onChange={(e) => setTaskForm({ ...taskForm, isMilestone: e.target.checked })}
                  className="rounded border-line"
                />
                <label htmlFor="isMilestone" className="text-xs font-semibold text-ink flex items-center gap-1">
                  <Flag className="h-3 w-3 text-amber-500" />
                  Mark as Key Project Milestone
                </label>
              </div>

              {taskForm.isMilestone && (
                <div>
                  <label className="block text-xs font-semibold text-ink">Milestone Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Substructure Sign-off"
                    value={taskForm.milestoneTitle}
                    onChange={(e) => setTaskForm({ ...taskForm, milestoneTitle: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Scheduling..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Task Dependency */}
      {showAddDepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent" />
                Link Task Dependency (Predecessor)
              </h3>
              <button onClick={() => setShowAddDepModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDependency} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Successor Task *</label>
                <select
                  required
                  value={depForm.taskId}
                  onChange={(e) => setDepForm({ ...depForm, taskId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="">Select Successor Task</option>
                  {allTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.taskCode} - {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Predecessor Task *</label>
                <select
                  required
                  value={depForm.predecessorTaskId}
                  onChange={(e) => setDepForm({ ...depForm, predecessorTaskId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="">Select Predecessor Task</option>
                  {allTasks
                    .filter((t) => t.id !== depForm.taskId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.taskCode} - {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Type</label>
                  <select
                    value={depForm.dependencyType}
                    onChange={(e) => setDepForm({ ...depForm, dependencyType: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="FINISH_TO_START">Finish-to-Start (FS)</option>
                    <option value="START_TO_START">Start-to-Start (SS)</option>
                    <option value="FINISH_TO_FINISH">Finish-to-Finish (FF)</option>
                    <option value="START_TO_FINISH">Start-to-Finish (SF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Lag Days</label>
                  <input
                    type="number"
                    value={depForm.lagDays}
                    onChange={(e) => setDepForm({ ...depForm, lagDays: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDepModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Linking..." : "Establish Dependency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Update Task Progress */}
      {selectedTaskForUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                Update Task Execution
              </h3>
              <button onClick={() => setSelectedTaskForUpdate(null)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="mt-4 space-y-3">
              <div className="text-xs">
                <span className="font-mono text-[10px] text-accent font-bold">
                  {selectedTaskForUpdate.taskCode}
                </span>
                <p className="font-semibold text-ink mt-0.5">{selectedTaskForUpdate.title}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">
                  Completion Percentage: {updateForm.completionPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={updateForm.completionPercent}
                  onChange={(e) =>
                    setUpdateForm({
                      ...updateForm,
                      completionPercent: Number(e.target.value),
                      status: Number(e.target.value) === 100 ? "COMPLETED" : "IN_PROGRESS",
                    })
                  }
                  className="mt-2 w-full accent-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Status</label>
                <select
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForUpdate(null)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
