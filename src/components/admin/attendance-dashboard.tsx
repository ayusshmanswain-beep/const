"use client";

// ==============================================================================
// CONSTRUCT360 ATTENDANCE VERIFICATION DASHBOARD & SUPERVISOR APPROVALS
// ==============================================================================

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";

const GeofenceMap = dynamic(() => import("@/components/maps/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] w-full animate-pulse rounded bg-stone/40 flex items-center justify-center text-xs text-muted">
      Loading Telemetry Map...
    </div>
  ),
});

export default function AttendanceDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"live" | "exceptions" | "history">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewModalSession, setReviewModalSession] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewComments, setReviewComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/attendance/sessions?limit=50", {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSessions(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleReviewException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalSession) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/attendance/exceptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          sessionId: reviewModalSession.id,
          decision: reviewDecision,
          comments: reviewComments || `Supervisor decision: ${reviewDecision}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setReviewModalSession(null);
        fetchSessions();
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered views
  const exceptions = sessions.filter(
    (s) => s.verificationStatus === "FLAGGED" && s.approvalStatus === "PENDING"
  );

  const filteredSessions = sessions.filter(
    (s) =>
      s.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sessionDate.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            Attendance Verification & PostGIS Telemetry Audit
          </h2>
          <p className="text-xs text-muted">
            Independent server-side spatial distance calculation, GPS accuracy filtering, and exception governance.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Live Stream
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab("live")}
          className={`pb-2.5 px-3 text-xs font-medium transition-colors border-b-2 ${
            activeTab === "live"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Live Telemetry & Punches ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("exceptions")}
          className={`pb-2.5 px-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "exceptions"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Exceptions & Approvals
          {exceptions.length > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
              {exceptions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2.5 px-3 text-xs font-medium transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-accent text-ink font-semibold"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Attendance Session History
        </button>
      </div>

      {/* TAB 1: LIVE TELEMETRY & SPATIAL MAP */}
      {activeTab === "live" && (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-panel p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-medium text-ink">Field Punch Telemetry Distribution</span>
              <span className="text-[11px] text-muted">
                Green = Inside perimeter &bull; Red = Outside perimeter
              </span>
            </div>
            <GeofenceMap
              className="h-[300px] w-full rounded border border-line"
              punches={sessions.flatMap((s) =>
                (s.events || []).map((ev: any) => ({
                  id: ev.id,
                  workerName: s.workerName,
                  latitude: ev.latitude,
                  longitude: ev.longitude,
                  distanceMeters: ev.calculatedDistanceMeters,
                  isInside: ev.isInsideGeofence,
                  accuracyMeters: ev.gpsAccuracyMeters,
                  eventType: ev.eventType,
                  timestamp: new Date(ev.serverTimestamp).toLocaleTimeString(),
                }))
              )}
            />
          </div>

          {/* Real-Time Punch Table */}
          <div className="overflow-x-auto rounded border border-line bg-panel shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Worker</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">WGS-84 Distance</th>
                  <th className="py-2.5 px-3">GPS Accuracy</th>
                  <th className="py-2.5 px-3">Server Timestamp</th>
                  <th className="py-2.5 px-3">Spatial Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {sessions.map((session) => {
                  const ev = session.lastEvent;
                  return (
                    <tr key={session.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink">{session.workerName}</div>
                        <div className="text-[10px] font-mono text-muted">{session.workerCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{session.siteName}</div>
                        <div className="text-[10px] text-muted">Radius: {ev?.configuredRadiusSnapshotMeters || 150}m</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-medium">
                          {ev?.eventType || "CLOCK_IN"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-semibold text-ink">
                          {ev?.calculatedDistanceMeters ?? 0}m
                        </span>
                        <span className="block text-[10px] text-muted">from site centroid</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted">
                        &plusmn;{ev?.gpsAccuracyMeters ?? 0}m
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted">
                        {session.firstClockIn
                          ? new Date(session.firstClockIn).toLocaleTimeString()
                          : "-"}
                      </td>
                      <td className="py-3 px-3">
                        {session.verificationStatus === "VERIFIED" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-sage/60 px-2 py-0.5 text-[10px] font-bold text-olive">
                            <CheckCircle className="h-3 w-3" />
                            VERIFIED (INSIDE)
                          </span>
                        ) : session.verificationStatus === "FLAGGED" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />
                            FLAGGED (OUTSIDE)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            <XCircle className="h-3 w-3" />
                            REJECTED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {sessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted">
                      No attendance sessions registered today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEPTIONS & SUPERVISOR APPROVALS */}
      {activeTab === "exceptions" && (
        <div className="space-y-3">
          <div className="rounded border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
            <strong>Supervisor Exception Governance:</strong> The following sessions were flagged because
            the worker checked in outside the site perimeter, had high risk telemetry signals, or
            exceeded normal parameters. Review and provide an auditable signature decision.
          </div>

          <div className="overflow-x-auto rounded border border-line bg-panel shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Worker</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3">Distance & Perimeter</th>
                  <th className="py-2.5 px-3">Exception Reason</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {exceptions.map((session) => {
                  const ev = session.lastEvent;
                  return (
                    <tr key={session.id}>
                      <td className="py-3 px-3 font-semibold">{session.workerName}</td>
                      <td className="py-3 px-3">{session.siteName}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className="text-red-700 font-semibold">{ev?.calculatedDistanceMeters}m</span> /{" "}
                        {ev?.configuredRadiusSnapshotMeters}m
                      </td>
                      <td className="py-3 px-3 text-amber-800 dark:text-amber-300 font-medium">
                        {session.remarks || "Punched outside configured site boundary"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted">
                        {new Date(session.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setReviewModalSession(session);
                            setReviewDecision("APPROVED");
                            setReviewComments("");
                          }}
                          className="rounded bg-ink px-3 py-1 text-xs font-medium text-canvas hover:opacity-90"
                        >
                          Review Exception
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {exceptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      No pending attendance exceptions requiring supervisor review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE SESSION HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by worker or site..."
              className="w-full rounded border border-line bg-panel pl-8 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="overflow-x-auto rounded border border-line bg-panel shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Session Date</th>
                  <th className="py-2.5 px-3">Worker</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3">Clock In</th>
                  <th className="py-2.5 px-3">Clock Out</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Overtime</th>
                  <th className="py-2.5 px-3">Session Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {filteredSessions.map((session) => (
                  <tr key={session.id}>
                    <td className="py-2.5 px-3 font-mono">{session.sessionDate}</td>
                    <td className="py-2.5 px-3 font-semibold">{session.workerName}</td>
                    <td className="py-2.5 px-3 text-muted">{session.siteName}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {session.firstClockIn ? new Date(session.firstClockIn).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {session.lastClockOut ? new Date(session.lastClockOut).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {Math.floor(session.totalDurationMinutes / 60)}h {session.totalDurationMinutes % 60}m
                    </td>
                    <td className="py-2.5 px-3 font-mono text-accent">
                      {session.overtimeMinutes > 0 ? `${session.overtimeMinutes}m` : "0m"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-stone/50 px-2 py-0.5 text-[10px] font-semibold text-graphite">
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPERVISOR APPROVAL MODAL */}
      {reviewModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-panel p-5 shadow-xl border border-line text-xs">
            <h3 className="font-semibold text-ink mb-2">
              Review Attendance Exception for {reviewModalSession.workerName}
            </h3>
            <p className="text-muted mb-4">
              Punched at <strong>{reviewModalSession.siteName}</strong> on{" "}
              {reviewModalSession.sessionDate}. Calculated distance:{" "}
              <strong>{reviewModalSession.lastEvent?.calculatedDistanceMeters}m</strong> (Site Radius:{" "}
              {reviewModalSession.lastEvent?.configuredRadiusSnapshotMeters}m).
            </p>

            <form onSubmit={handleReviewException} className="space-y-4">
              <div>
                <label className="block text-muted font-medium mb-1">Supervisor Determination</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-olive">
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={reviewDecision === "APPROVED"}
                      onChange={() => setReviewDecision("APPROVED")}
                    />
                    Approve Exception
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-red-700">
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === "REJECTED"}
                      onChange={() => setReviewDecision("REJECTED")}
                    />
                    Reject Exception
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Supervisor Audit Comments *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="e.g. Worker was authorized at offsite storage perimeter to receive structural steel delivery."
                  className="w-full rounded border border-line bg-canvas p-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setReviewModalSession(null)}
                  className="rounded border border-line bg-canvas px-3 py-1.5 text-xs text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? "Recording Signature..." : "Submit Determination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
