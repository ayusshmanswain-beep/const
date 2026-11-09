"use client";

// ==============================================================================
// CONSTRUCT360 CONSTRUCTION PROGRESS, FIELD MEASUREMENTS & DELAY MITIGATION
// BOQ Quantities, Daily Log Verification Sign-Off & Delay Tracking
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  Ruler,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Camera,
  FileCheck2,
  ShieldAlert,
  Building,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface Activity {
  id: string;
  projectId: string;
  taskId?: string;
  siteId: string;
  activityCode: string;
  activityName: string;
  trade: string;
  measurementUnit: string;
  plannedQuantity: number;
  actualQuantityExecuted: number;
  ratePerUnit: number;
  status: "PLANNED" | "IN_EXECUTION" | "COMPLETED";
}

interface MeasurementLog {
  id: string;
  projectId: string;
  activityId: string;
  measurementDate: string;
  quantityRecorded: number;
  locationDescription: string;
  recordedByUserId: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "DISCREPANCY";
  verificationNotes?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  sitePhotoUrls: string[];
}

interface DelayRecord {
  id: string;
  projectId: string;
  delayReasonCategory: string;
  delayDaysImpact: number;
  title: string;
  description: string;
  mitigationAction: string;
  isCriticalPathImpact: boolean;
  status: "OPEN" | "MITIGATING" | "RESOLVED";
  createdAt: string;
  resolvedAt?: string;
}

export default function ProgressMeasurement({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState<"activities" | "logs" | "delays">("activities");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [verifyLogTarget, setVerifyLogTarget] = useState<MeasurementLog | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<"VERIFIED" | "REJECTED" | "DISCREPANCY">("VERIFIED");
  const [verifyNotes, setVerifyNotes] = useState("");

  // Forms
  const [activityForm, setActivityForm] = useState({
    activityCode: "",
    activityName: "",
    trade: "CONCRETE",
    measurementUnit: "CUM" as const,
    plannedQuantity: 100,
    ratePerUnit: 6500,
  });

  const [logForm, setLogForm] = useState({
    activityId: "",
    measurementDate: new Date().toISOString().split("T")[0],
    quantityRecorded: 10,
    locationDescription: "",
    photoUrl: "",
  });

  const [delayForm, setDelayForm] = useState({
    delayReasonCategory: "WEATHER_MONSOON" as const,
    delayDaysImpact: 2,
    title: "",
    description: "",
    mitigationAction: "",
    isCriticalPathImpact: false,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actRes, logRes, delRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/progress`, { headers: { "x-construct-csrf": "1" } }),
        fetch(`/api/v1/projects/${projectId}/progress/measurements`, { headers: { "x-construct-csrf": "1" } }),
        fetch(`/api/v1/projects/${projectId}/delays`, { headers: { "x-construct-csrf": "1" } }),
      ]);

      const actJson = await actRes.json();
      const logJson = await logRes.json();
      const delJson = await delRes.json();

      if (actJson.success) setActivities(actJson.data);
      if (logJson.success) setLogs(logJson.data);
      if (delJson.success) setDelays(delJson.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          activityCode: activityForm.activityCode.trim(),
          activityName: activityForm.activityName.trim(),
          trade: activityForm.trade.trim(),
          measurementUnit: activityForm.measurementUnit,
          plannedQuantity: Number(activityForm.plannedQuantity),
          ratePerUnit: Number(activityForm.ratePerUnit),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddActivityModal(false);
        setActivityForm({
          activityCode: "",
          activityName: "",
          trade: "CONCRETE",
          measurementUnit: "CUM",
          plannedQuantity: 100,
          ratePerUnit: 6500,
        });
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to create BOQ activity");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating BOQ activity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/progress/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          activityId: logForm.activityId,
          measurementDate: logForm.measurementDate,
          quantityRecorded: Number(logForm.quantityRecorded),
          locationDescription: logForm.locationDescription.trim(),
          sitePhotoUrls: logForm.photoUrl ? [logForm.photoUrl.trim()] : [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowLogModal(false);
        setLogForm({
          activityId: "",
          measurementDate: new Date().toISOString().split("T")[0],
          quantityRecorded: 10,
          locationDescription: "",
          photoUrl: "",
        });
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to log progress measurement");
      }
    } catch (err: any) {
      alert(err?.message || "Error logging measurement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyLogTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/progress/measurements/${verifyLogTarget.id}/verify`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
          body: JSON.stringify({
            status: verifyStatus,
            notes: verifyNotes.trim() || undefined,
          }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setVerifyLogTarget(null);
        setVerifyNotes("");
        await fetchData();
      } else {
        alert(json.error?.message || "Verification failed");
      }
    } catch (err: any) {
      alert(err?.message || "Error verifying log");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/delays`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          delayReasonCategory: delayForm.delayReasonCategory,
          delayDaysImpact: Number(delayForm.delayDaysImpact),
          title: delayForm.title.trim(),
          description: delayForm.description.trim(),
          mitigationAction: delayForm.mitigationAction.trim(),
          isCriticalPathImpact: delayForm.isCriticalPathImpact,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowDelayModal(false);
        setDelayForm({
          delayReasonCategory: "WEATHER_MONSOON",
          delayDaysImpact: 2,
          title: "",
          description: "",
          mitigationAction: "",
          isCriticalPathImpact: false,
        });
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to report delay");
      }
    } catch (err: any) {
      alert(err?.message || "Error reporting delay");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveDelay = async (delayId: string) => {
    const notes = prompt("Enter resolution notes and corrective actions implemented:");
    if (notes === null) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/delays/${delayId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({ mitigationNotes: notes }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to resolve delay");
      }
    } catch (err: any) {
      alert(err?.message || "Error resolving delay");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("activities")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "activities"
                ? "bg-ink text-canvas shadow-xs"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            BOQ Scope Tracking ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "logs"
                ? "bg-ink text-canvas shadow-xs"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            Field Measurement Logs & Sign-Off ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("delays")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === "delays"
                ? "bg-ink text-canvas shadow-xs"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            Site Delays & Mitigation ({delays.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {activeTab === "activities" && (
            <button
              onClick={() => setShowAddActivityModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add BOQ Item
            </button>
          )}
          {activeTab === "logs" && (
            <button
              onClick={() => setShowLogModal(true)}
              disabled={activities.length === 0}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Field Measurement
            </button>
          )}
          {activeTab === "delays" && (
            <button
              onClick={() => setShowDelayModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-rose-800"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Report Site Delay
            </button>
          )}
        </div>
      </div>

      {/* View 1: BOQ Activities Table */}
      {activeTab === "activities" && (
        <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-canvas border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Activity Code & Item</th>
                <th className="px-3 py-3">Trade</th>
                <th className="px-3 py-3 text-right">Planned Qty</th>
                <th className="px-3 py-3 text-right">Executed Qty</th>
                <th className="px-4 py-3">Completion %</th>
                <th className="px-3 py-3 text-right">Unit Rate</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No BOQ activities recorded. Click &quot;Add BOQ Item&quot; to define quantities.
                  </td>
                </tr>
              ) : (
                activities.map((act) => {
                  const percent = act.plannedQuantity > 0
                    ? Math.round((act.actualQuantityExecuted / act.plannedQuantity) * 100)
                    : 0;
                  return (
                    <tr key={act.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1 py-0.5 rounded">
                          {act.activityCode}
                        </span>
                        <div className="font-semibold text-ink mt-0.5">{act.activityName}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">
                        <span className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-[10px]">
                          {act.trade}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-ink">
                        {act.plannedQuantity.toLocaleString()} {act.measurementUnit}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">
                        {act.actualQuantityExecuted.toLocaleString()} {act.measurementUnit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-stone/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-ink w-8 text-right">
                            {percent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-muted">
                        ₹{act.ratePerUnit?.toLocaleString() || 0}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                            act.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : act.status === "IN_EXECUTION"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-stone/50 text-muted"
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Measurement Logs Table & Verification */}
      {activeTab === "logs" && (
        <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-canvas border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Activity</th>
                <th className="px-3 py-3 text-right">Quantity Recorded</th>
                <th className="px-4 py-3">Location & Grid Details</th>
                <th className="px-3 py-3 text-center">Evidence</th>
                <th className="px-3 py-3 text-center">Verification Status</th>
                <th className="px-4 py-3 text-right">Sign-Off Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No field measurement logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const act = activities.find((a) => a.id === log.activityId);
                  return (
                    <tr key={log.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-ink">
                        {new Date(log.measurementDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-3 font-medium text-ink">
                        <span className="font-mono text-[10px] text-accent mr-1">
                          {act?.activityCode || "ACT"}
                        </span>
                        <span>{act?.activityName || "Unknown Activity"}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-ink">
                        {log.quantityRecorded.toLocaleString()} {act?.measurementUnit}
                      </td>
                      <td className="px-4 py-3 text-muted text-[11px]">
                        {log.locationDescription}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {log.sitePhotoUrls.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-stone/40 px-1.5 py-0.5 text-[10px] font-mono text-accent">
                            <Camera className="h-3 w-3" />
                            {log.sitePhotoUrls.length} photo(s)
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted">None</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                            log.verificationStatus === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.verificationStatus === "REJECTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {log.verificationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.verificationStatus === "PENDING" ? (
                          <button
                            onClick={() => {
                              setVerifyLogTarget(log);
                              setVerifyStatus("VERIFIED");
                            }}
                            className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-[10px] font-bold text-canvas hover:bg-accent/90"
                          >
                            <FileCheck2 className="h-3 w-3" />
                            Sign-Off
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted italic">Verified</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 3: Delays & Mitigation */}
      {activeTab === "delays" && (
        <div className="space-y-3">
          {delays.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-panel/50 p-8 text-center text-muted">
              No site delay incidents reported. Work is progressing as scheduled.
            </div>
          ) : (
            delays.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-line bg-panel p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
                      {d.delayReasonCategory}
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-700">
                      Impact: +{d.delayDaysImpact} Day(s)
                    </span>
                    {d.isCriticalPathImpact && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                        CRITICAL PATH HIT
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                        d.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>

                  <h4 className="mt-1 text-sm font-bold text-ink">{d.title}</h4>
                  <p className="mt-0.5 text-xs text-muted">{d.description}</p>

                  <div className="mt-2 text-xs bg-canvas p-2 rounded border border-line">
                    <span className="font-semibold text-accent">Mitigation Strategy: </span>
                    <span className="text-ink">{d.mitigationAction}</span>
                  </div>
                </div>

                {d.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleResolveDelay(d.id)}
                    className="shrink-0 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink hover:bg-stone/40"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Add BOQ Activity */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Plus className="h-4 w-4 text-accent" />
                Add BOQ Activity Item
              </h3>
              <button onClick={() => setShowAddActivityModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Activity Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ACT-CONC-02"
                  value={activityForm.activityCode}
                  onChange={(e) => setActivityForm({ ...activityForm, activityCode: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Activity Name / Scope *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade Beam Reinforced Concrete"
                  value={activityForm.activityName}
                  onChange={(e) => setActivityForm({ ...activityForm, activityName: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Trade</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CONCRETE"
                    value={activityForm.trade}
                    onChange={(e) => setActivityForm({ ...activityForm, trade: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Unit</label>
                  <select
                    value={activityForm.measurementUnit}
                    onChange={(e) => setActivityForm({ ...activityForm, measurementUnit: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="CUM">CUM (Cubic Metre)</option>
                    <option value="SQM">SQM (Square Metre)</option>
                    <option value="MT">MT (Metric Tonne)</option>
                    <option value="RMT">RMT (Running Metre)</option>
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="BAGS">BAGS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Planned Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={activityForm.plannedQuantity}
                    onChange={(e) => setActivityForm({ ...activityForm, plannedQuantity: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Rate per Unit (INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={activityForm.ratePerUnit}
                    onChange={(e) => setActivityForm({ ...activityForm, ratePerUnit: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Field Measurement */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Ruler className="h-4 w-4 text-accent" />
                Record Daily Field Measurement
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogMeasurement} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">BOQ Activity *</label>
                <select
                  required
                  value={logForm.activityId}
                  onChange={(e) => setLogForm({ ...logForm, activityId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="">Select Activity</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.activityCode} - {a.activityName} ({a.measurementUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Measurement Date *</label>
                  <input
                    type="date"
                    required
                    value={logForm.measurementDate}
                    onChange={(e) => setLogForm({ ...logForm, measurementDate: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Executed Quantity *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={logForm.quantityRecorded}
                    onChange={(e) => setLogForm({ ...logForm, quantityRecorded: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Exact Site Grid / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower A - Level 3 Grid C2-E4 Slab"
                  value={logForm.locationDescription}
                  onChange={(e) => setLogForm({ ...logForm, locationDescription: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Photo Evidence URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={logForm.photoUrl}
                  onChange={(e) => setLogForm({ ...logForm, photoUrl: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Measurement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verify Log Sign-Off */}
      {verifyLogTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-accent" />
                Engineer Measurement Sign-Off
              </h3>
              <button onClick={() => setVerifyLogTarget(null)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyMeasurement} className="mt-4 space-y-3">
              <div className="text-xs bg-canvas p-3 rounded border border-line">
                <span className="font-semibold text-muted block">Measurement Log:</span>
                <span className="font-bold text-ink text-sm">
                  {verifyLogTarget.quantityRecorded} Units at {verifyLogTarget.locationDescription}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Sign-Off Decision</label>
                <select
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="VERIFIED">Verified & Approved (Increment Executed Qty)</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISCREPANCY">Discrepancy (Requires Re-survey)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Engineer Inspection Notes</label>
                <textarea
                  rows={2}
                  placeholder="Verification remarks, level survey check, rebar inspection check..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setVerifyLogTarget(null)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting ? "Signing Off..." : "Confirm Sign-Off"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Report Site Delay */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Report Construction Delay Event
              </h3>
              <button onClick={() => setShowDelayModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReportDelay} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Delay Root Cause *</label>
                  <select
                    value={delayForm.delayReasonCategory}
                    onChange={(e) => setDelayForm({ ...delayForm, delayReasonCategory: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="WEATHER_MONSOON">Monsoon / Inclement Weather</option>
                    <option value="MATERIAL_SHORTAGE">Material Supply Shortage</option>
                    <option value="LABOUR_SHORTAGE">Labour Shortage / Strike</option>
                    <option value="CLIENT_DRAWING_REVISION">Client Drawing Revision</option>
                    <option value="PERMIT_DELAY">Permit / Municipal Delay</option>
                    <option value="EQUIPMENT_BREAKDOWN">Heavy Equipment Breakdown</option>
                    <option value="FINANCIAL">Financial / Cash Flow Hold</option>
                    <option value="SITE_ACCIDENT">Site Safety Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Estimated Days Impact *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={delayForm.delayDaysImpact}
                    onChange={(e) => setDelayForm({ ...delayForm, delayDaysImpact: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Delay Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unprecedented Pit Inundation from Cyclone"
                  value={delayForm.title}
                  onChange={(e) => setDelayForm({ ...delayForm, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Description & Impact Analysis *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe exact conditions and site zones impacted..."
                  value={delayForm.description}
                  onChange={(e) => setDelayForm({ ...delayForm, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Corrective Mitigation Action *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Actions to recover schedule: dewatering pumps, night shift, re-sequencing..."
                  value={delayForm.mitigationAction}
                  onChange={(e) => setDelayForm({ ...delayForm, mitigationAction: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="critPath"
                  checked={delayForm.isCriticalPathImpact}
                  onChange={(e) => setDelayForm({ ...delayForm, isCriticalPathImpact: e.target.checked })}
                  className="rounded border-line"
                />
                <label htmlFor="critPath" className="text-xs font-semibold text-ink">
                  Direct Impact on Project Critical Path & Completion Date
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-rose-700 px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-rose-800 disabled:opacity-50"
                >
                  {submitting ? "Logging..." : "Record Delay Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
