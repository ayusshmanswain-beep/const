"use client";

// ==============================================================================
// CONSTRUCT360 RESPONSIVE EMPLOYEE SELF-SERVICE PORTAL
// Profile, Attendance Muster, Salary Slip Breakdown, Leave Management & Bulletins
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  User,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Briefcase,
  Building,
  Phone,
  Mail,
  Shield,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function EmployeePortal() {
  const [profile, setProfile] = useState<any | null>(null);
  const [salary, setSalary] = useState<any | null>(null);
  const [leaves, setLeaves] = useState<{ balances: any[]; requests: any[] }>({
    balances: [],
    requests: [],
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Leave Application Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState("Family commitment");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [profileRes, salaryRes, leavesRes, announcementsRes, attRes] = await Promise.all([
        fetch("/api/v1/workforce/portal/profile", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/workforce/portal/salary", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/workforce/portal/leaves", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/workforce/portal/announcements", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/attendance/sessions?limit=5", { headers: { "x-construct-csrf": "1" } }),
      ]);

      const [pJson, sJson, lJson, aJson, attJson] = await Promise.all([
        profileRes.json(),
        salaryRes.json(),
        leavesRes.json(),
        announcementsRes.json(),
        attRes.json(),
      ]);

      if (pJson.success && pJson.data) setProfile(pJson.data);
      if (sJson.success && sJson.data) setSalary(sJson.data.salary);
      if (lJson.success && lJson.data) {
        setLeaves(lJson.data);
        if (lJson.data.balances?.[0]?.leaveTypeId) {
          setLeaveTypeId(lJson.data.balances[0].leaveTypeId);
        }
      }
      if (aJson.success && aJson.data) setAnnouncements(aJson.data);
      if (attJson.success && attJson.data) setAttendanceLogs(attJson.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    setLeaveSuccess(null);
    try {
      const res = await fetch("/api/v1/workforce/portal/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          leaveTypeId,
          startDate,
          endDate,
          reason: leaveReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowLeaveModal(false);
        setLeaveSuccess("Leave application submitted successfully for supervisor approval.");
        fetchPortalData();
      }
    } catch {
    } finally {
      setSubmittingLeave(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading && !profile) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs font-medium text-muted">Loading employee self-service records...</p>
      </div>
    );
  }

  const emp = profile?.employee;

  return (
    <div className="space-y-6">
      {/* Header Profile Identity Strip */}
      <div className="rounded-lg border border-line bg-panel p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-accent text-canvas flex items-center justify-center font-bold text-xl uppercase shadow-xs">
              {emp?.firstName?.[0]}
              {emp?.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink">
                  {emp?.firstName} {emp?.lastName}
                </h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {emp?.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-mono font-bold text-accent">{emp?.employeeCode}</span>
                <span>&bull;</span>
                <span className="text-ink font-medium">{emp?.designation?.title || "Project Engineer"}</span>
                <span>&bull;</span>
                <span>{emp?.department?.name || "Civil Engineering"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPortalData}
              className="flex items-center gap-1.5 rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted" />
              Sync Portal
            </button>
          </div>
        </div>
      </div>

      {leaveSuccess && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          {leaveSuccess}
        </div>
      )}

      {/* Main Grid: Assignments, Attendance & Salary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Work Assignment & Profile Attributes */}
        <div className="space-y-6">
          {/* Site Assignment & Geofence Status */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-ink">Active Site Assignment</h3>
              </div>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-mono font-bold text-accent">
                AUTHORIZED
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-ink text-sm">
                {emp?.site?.name || "Tower A - Commercial Enclave"}
              </div>
              <p className="text-muted leading-relaxed">
                Geofence perimeter enforced via WGS-84 coordinate validation. GPS permission requested only on punch.
              </p>
              <div className="border-t border-line/60 pt-2 text-[11px] text-muted space-y-1">
                <div>Shift: <strong>08:00 AM - 05:00 PM (General Day)</strong></div>
                <div>Supervisor: <strong>Rajesh Menon (VP Operations)</strong></div>
                <div>Joining Date: <strong>{emp?.joiningDate}</strong></div>
              </div>
            </div>
          </div>

          {/* Emergency & ID Compliance Info */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">Personal & Emergency Contact</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Mobile Phone:</span>
                <span className="font-medium text-ink">{emp?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Emergency Contact:</span>
                <span className="font-medium text-ink">{emp?.emergencyContactName || "Family Contact"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Emergency Phone:</span>
                <span className="font-medium text-ink">{emp?.emergencyContactPhone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Relation:</span>
                <span className="font-medium text-ink">{emp?.emergencyContactRelation || "Spouse"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Compensation & Leave Management */}
        <div className="space-y-6">
          {/* Salary Breakdown Slip */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-ink">Monthly Pay Structure</h3>
              </div>
              <span className="text-[10px] font-mono text-muted">MONTHLY SLIP</span>
            </div>

            {salary ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Basic Salary:</span>
                  <span className="font-mono font-medium text-ink">
                    {formatCurrency(salary.basePayMonthly)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>House Rent Allowance (HRA):</span>
                  <span className="font-mono font-medium text-ink">
                    {formatCurrency(salary.hraMonthly)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Site & Field Allowance:</span>
                  <span className="font-mono font-medium text-ink">
                    {formatCurrency(salary.siteAllowanceMonthly)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-line/60 pt-1.5 font-semibold text-ink">
                  <span>Gross Monthly CTC:</span>
                  <span className="font-mono">{formatCurrency(salary.grossMonthlySalary)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Provident Fund (PF Deduction):</span>
                  <span className="font-mono text-red-700">
                    - {formatCurrency(salary.providentFundMonthly || 1800)}
                  </span>
                </div>
                <div className="flex justify-between border-t-2 border-accent pt-2 font-bold text-emerald-800 text-sm">
                  <span>Net Disbursable Salary:</span>
                  <span className="font-mono text-base">
                    {formatCurrency(salary.netMonthlyPay || salary.grossMonthlySalary - 2000)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">Pay structure record pending configuration.</p>
            )}
          </div>

          {/* Leave Balances & Apply Action */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-ink">Annual Leave Balances</h3>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="flex items-center gap-1 rounded bg-ink px-2.5 py-1 text-[11px] font-medium text-canvas hover:bg-ink/90"
              >
                <PlusCircle className="h-3 w-3 text-accent" />
                Apply Leave
              </button>
            </div>

            {/* Leave Chips */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {leaves.balances.length > 0 ? (
                leaves.balances.map((b) => (
                  <div key={b.id} className="rounded border border-line bg-canvas p-2.5 text-center">
                    <span className="text-[10px] uppercase text-muted font-semibold block">
                      {b.leaveType?.name || "Leave"}
                    </span>
                    <span className="text-base font-bold font-mono text-ink">
                      {b.balanceDays}
                    </span>
                    <span className="text-[9px] text-muted block">available</span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center text-xs text-muted py-2">
                  Standard balance: 12 Casual &bull; 8 Sick &bull; 15 Earned
                </div>
              )}
            </div>

            {/* Recent Leave Requests */}
            <div className="space-y-1.5 border-t border-line/60 pt-3">
              <span className="text-[10px] uppercase font-semibold text-muted block">
                Recent Leave Submissions
              </span>
              {leaves.requests.length > 0 ? (
                leaves.requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded bg-canvas px-2.5 py-1.5 text-xs"
                  >
                    <div>
                      <div className="font-medium text-ink">{req.leaveType?.name || "Leave"}</div>
                      <div className="text-[10px] text-muted">
                        {req.startDate} to {req.endDate}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : req.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted">No recent leave requests filed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance History & Company Bulletins */}
        <div className="space-y-6">
          {/* Company & Site Announcements */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">Safety Bulletins & Circulars</h3>
            </div>
            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((a) => (
                  <div key={a.id} className="rounded border border-line/60 bg-canvas p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{a.title}</span>
                      {a.isPinned && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[9px] font-bold text-accent">
                          PINNED
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed">{a.content}</p>
                    <div className="text-[10px] text-muted/80">
                      Published on {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">No new announcements posted.</p>
              )}
            </div>
          </div>

          {/* Recent Attendance Session Logs */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">Recent Attendance Punches</h3>
            </div>
            <div className="space-y-2">
              {attendanceLogs.length > 0 ? (
                attendanceLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded border border-line/60 bg-canvas px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink">
                        {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                        {log.checkOutTime && (
                          <span> &bull; Out: {new Date(log.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted">{log.site?.name || "Tower A Site"}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        log.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "EXCEPTION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-stone/50 text-muted"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted">No recent punches recorded today.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Apply Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-3">Submit Leave Application</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Leave Category *</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                >
                  {leaves.balances.map((b) => (
                    <option key={b.id} value={b.leaveTypeId}>
                      {b.leaveType?.name || "Leave"} (Balance: {b.balanceDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Reason / Justification *</label>
                <input
                  type="text"
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {submittingLeave && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
