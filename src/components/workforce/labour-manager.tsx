"use client";

// ==============================================================================
// CONSTRUCT360 DAILY-WAGE LABOUR & GANG MANAGEMENT
// Registration, Wage Rates, Wage Calculator, Cash Advances & Site Transfers
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  HardHat,
  UserPlus,
  Search,
  Calculator,
  Coins,
  ArrowRightLeft,
  Building,
  Briefcase,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  AlertCircle,
  Hammer,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface Labourer {
  id: string;
  labourerCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  skillLevel: "UNSKILLED" | "SEMI_SKILLED" | "SKILLED" | "HIGHLY_SKILLED";
  primaryTrade: string;
  dailyWageRate: number;
  hourlyWageRate?: number;
  pieceRateWage?: number;
  groupName?: string;
  availabilityStatus: "AVAILABLE" | "ON_SITE" | "ON_LEAVE" | "INACTIVE";
  isActive: boolean;
  contractorId?: string;
  contractor?: { id: string; businessName: string };
  currentSiteId?: string;
  site?: { id: string; name: string };
  outstandingAdvances?: number;
}

export default function LabourManager() {
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrade, setFilterTrade] = useState("ALL");
  const [filterSkill, setFilterSkill] = useState("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWageModal, setShowWageModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedLabourer, setSelectedLabourer] = useState<Labourer | null>(null);

  // Wage Calculator State
  const [daysWorked, setDaysWorked] = useState(26);
  const [overtimeHours, setOvertimeHours] = useState(12);
  const [piecesCompleted, setPiecesCompleted] = useState(0);
  const [wageResult, setWageResult] = useState<any | null>(null);
  const [calculatingWage, setCalculatingWage] = useState(false);

  // Advance Request State
  const [advanceAmount, setAdvanceAmount] = useState(3000);
  const [advanceReason, setAdvanceReason] = useState("Festival emergency allowance");

  // Transfer State
  const [transferSiteId, setTransferSiteId] = useState("");
  const [transferReason, setTransferReason] = useState("Reallocated for high-priority RCC casting slab");

  // Action feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Labourer Form
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    skillLevel: "SKILLED",
    primaryTrade: "MASON",
    dailyWageRate: 850,
    hourlyWageRate: 120,
    pieceRateWage: 0,
    groupName: "Gang-Alpha",
    emergencyPhone: "",
    idProofNumber: "",
  });

  const fetchLabourers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.append("search", search);
      if (filterTrade !== "ALL") params.append("trade", filterTrade);
      if (filterSkill !== "ALL") params.append("skillLevel", filterSkill);

      const res = await fetch(`/api/v1/workforce/labourers?${params.toString()}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLabourers(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabourers();
  }, [search, filterTrade, filterSkill]);

  // Create Labourer
  const handleCreateLabourer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/v1/workforce/labourers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || undefined,
          skillLevel: formData.skillLevel,
          primaryTrade: formData.primaryTrade,
          dailyWageRate: Number(formData.dailyWageRate),
          hourlyWageRate: Number(formData.hourlyWageRate),
          pieceRateWage: Number(formData.pieceRateWage) || undefined,
          groupName: formData.groupName.trim() || undefined,
          emergencyPhone: formData.emergencyPhone.trim() || undefined,
          idProofNumber: formData.idProofNumber.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        fetchLabourers();
        setActionMessage({ type: "success", text: "Labourer registered successfully with code " + json.data.labourerCode });
      } else {
        setActionMessage({ type: "error", text: json.error?.message || "Failed to create labourer" });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.message || "Error creating labourer" });
    } finally {
      setActionLoading(false);
    }
  };

  // Run Real-time Wage Calculation
  const calculateLabourWage = async () => {
    if (!selectedLabourer) return;
    setCalculatingWage(true);
    try {
      const params = new URLSearchParams({
        daysWorked: daysWorked.toString(),
        overtimeHours: overtimeHours.toString(),
        piecesCompleted: piecesCompleted.toString(),
      });
      const res = await fetch(`/api/v1/workforce/labourers/${selectedLabourer.id}/wage?${params.toString()}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success) {
        setWageResult(json.data);
      }
    } catch {
    } finally {
      setCalculatingWage(false);
    }
  };

  // Open Wage Modal & Pre-calculate
  const openWageModal = (lab: Labourer) => {
    setSelectedLabourer(lab);
    setWageResult(null);
    setShowWageModal(true);
  };

  useEffect(() => {
    if (showWageModal && selectedLabourer) {
      calculateLabourWage();
    }
  }, [daysWorked, overtimeHours, piecesCompleted, showWageModal]);

  // Request Cash Advance
  const handleRequestAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabourer) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/workforce/labourers/advances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          labourerId: selectedLabourer.id,
          amount: Number(advanceAmount),
          reason: advanceReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAdvanceModal(false);
        fetchLabourers();
        setActionMessage({ type: "success", text: `Advance request of ₹${advanceAmount} submitted successfully!` });
      }
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  // Transfer Worker
  const handleTransferWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabourer || !transferSiteId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/workforce/labourers/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          labourerId: selectedLabourer.id,
          toSiteId: transferSiteId,
          reason: transferReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowTransferModal(false);
        fetchLabourers();
        setActionMessage({ type: "success", text: "Worker site transfer initiated and recorded." });
      }
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const tradeOptions = [
    "MASON",
    "CARPENTER",
    "BAR_BENDER",
    "ELECTRICIAN",
    "PLUMBER",
    "WELDER",
    "PAINTER",
    "SCAFFOLDER",
    "HEAVY_EQUIPMENT_OPERATOR",
    "GENERAL_HELPER",
    "RIGGER",
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Daily-Wage Labourers & Gang Roster
          </h2>
          <p className="text-xs text-muted">
            Trade skills, daily wage calculation, overtime, cash advances, and site transfers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 transition-colors shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-accent" />
            Register Labourer
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`rounded-md border p-3 text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-700" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter Strip */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by worker name, code (e.g. LAB-001), gang, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-hidden focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="ALL">All Trades</option>
            {tradeOptions.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="ALL">All Skill Levels</option>
            <option value="HIGHLY_SKILLED">Highly Skilled</option>
            <option value="SKILLED">Skilled</option>
            <option value="SEMI_SKILLED">Semi Skilled</option>
            <option value="UNSKILLED">Unskilled</option>
          </select>
        </div>
      </div>

      {/* Labour Table */}
      <div className="rounded-lg border border-line bg-panel shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-muted uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Labourer</th>
                <th className="py-2.5 px-3">ID Code</th>
                <th className="py-2.5 px-3">Trade & Skill</th>
                <th className="py-2.5 px-3">Gang / Group</th>
                <th className="py-2.5 px-3">Daily Wage Rate</th>
                <th className="py-2.5 px-3">Assigned Site</th>
                <th className="py-2.5 px-3">Availability</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {labourers.map((lab) => (
                <tr key={lab.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-ink">
                      {lab.firstName} {lab.lastName}
                    </div>
                    <div className="text-[11px] text-muted">{lab.phone || "No phone listed"}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-accent">
                    {lab.labourerCode}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-ink flex items-center gap-1.5">
                      <Hammer className="h-3 w-3 text-accent" />
                      {lab.primaryTrade.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-muted">{lab.skillLevel}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded bg-stone/40 px-2 py-0.5 font-mono text-[10px] text-ink font-medium">
                      {lab.groupName || "Independent"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-ink">
                    ₹{lab.dailyWageRate}/day
                  </td>
                  <td className="py-2.5 px-3 text-muted">
                    {lab.site?.name || "Corporate HQ"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        lab.availabilityStatus === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800"
                          : lab.availabilityStatus === "ON_SITE"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-stone/60 text-muted"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {lab.availabilityStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openWageModal(lab)}
                        title="Calculate Periodic Wage"
                        className="rounded border border-line bg-canvas p-1.5 text-ink hover:bg-stone/20"
                      >
                        <Calculator className="h-3.5 w-3.5 text-accent" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLabourer(lab);
                          setShowAdvanceModal(true);
                        }}
                        title="Request Cash Advance"
                        className="rounded border border-line bg-canvas p-1.5 text-ink hover:bg-stone/20"
                      >
                        <Coins className="h-3.5 w-3.5 text-amber-700" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLabourer(lab);
                          setTransferSiteId(lab.currentSiteId || "");
                          setShowTransferModal(true);
                        }}
                        title="Transfer to Other Site"
                        className="rounded border border-line bg-canvas p-1.5 text-ink hover:bg-stone/20"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 text-blue-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {labourers.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No labourers registered matching the search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Wage Calculator */}
      {showWageModal && selectedLabourer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-line bg-panel p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Wage & Overtime Computation: {selectedLabourer.firstName} {selectedLabourer.lastName}
                </h3>
                <span className="font-mono text-xs text-accent font-bold">
                  {selectedLabourer.labourerCode} &bull; ₹{selectedLabourer.dailyWageRate}/day
                </span>
              </div>
              <button
                onClick={() => setShowWageModal(false)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Days Worked</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={daysWorked}
                    onChange={(e) => setDaysWorked(Number(e.target.value))}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Overtime (Hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(Number(e.target.value))}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Pieces Done</label>
                  <input
                    type="number"
                    min="0"
                    value={piecesCompleted}
                    onChange={(e) => setPiecesCompleted(Number(e.target.value))}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Wage Breakdown Calculation Box */}
              {wageResult && (
                <div className="rounded-md border border-line bg-canvas p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Basic Wages ({wageResult.daysPresent} days &times; ₹{wageResult.dailyWageRate}):</span>
                    <span className="font-mono font-semibold text-ink">₹{wageResult.basicWages?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Overtime Wages ({wageResult.overtimeHours} hrs &times; ₹{wageResult.overtimeRate}):</span>
                    <span className="font-mono font-semibold text-ink">₹{wageResult.overtimeWages?.toLocaleString()}</span>
                  </div>
                  {wageResult.pieceRateWages > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Piece Rate Earnings:</span>
                      <span className="font-mono font-semibold text-ink">₹{wageResult.pieceRateWages?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-line/60 pt-2 font-semibold text-ink">
                    <span>Gross Earnings:</span>
                    <span className="font-mono">₹{wageResult.grossWages?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Cash Advances Deducted:</span>
                    <span className="font-mono font-semibold">- ₹{wageResult.advancesDeducted?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-accent pt-2 text-sm font-bold text-emerald-800">
                    <span>Net Wage Disbursable:</span>
                    <span className="font-mono text-base">₹{wageResult.netWagePayable?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowWageModal(false)}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Cash Advance */}
      {showAdvanceModal && selectedLabourer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-2">
              Request Wage Advance: {selectedLabourer.firstName} {selectedLabourer.lastName}
            </h3>
            <p className="text-xs text-muted mb-4">
              Advances will be linked to the labourer profile and deducted on next wage settlement.
            </p>
            <form onSubmit={handleRequestAdvance} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="500"
                  max="25000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Reason for Advance *</label>
                <input
                  type="text"
                  required
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Submit Advance Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Site Transfer */}
      {showTransferModal && selectedLabourer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-2">
              Transfer Worker to Construction Site
            </h3>
            <p className="text-xs text-muted mb-4">
              Reallocate {selectedLabourer.firstName} {selectedLabourer.lastName} to another active site geofence.
            </p>
            <form onSubmit={handleTransferWorker} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Target Site UUID *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste site ID"
                  value={transferSiteId}
                  onChange={(e) => setTransferSiteId(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Transfer Justification *</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Confirm Site Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Labourer */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-lg border border-line bg-panel p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink">Register Daily Labourer</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLabourer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Primary Trade *</label>
                  <select
                    value={formData.primaryTrade}
                    onChange={(e) => setFormData({ ...formData, primaryTrade: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  >
                    {tradeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Skill Category *</label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value as any })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  >
                    <option value="HIGHLY_SKILLED">Highly Skilled</option>
                    <option value="SKILLED">Skilled</option>
                    <option value="SEMI_SKILLED">Semi Skilled</option>
                    <option value="UNSKILLED">Unskilled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Daily Wage Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.dailyWageRate}
                    onChange={(e) => setFormData({ ...formData, dailyWageRate: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Overtime Hourly Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.hourlyWageRate}
                    onChange={(e) => setFormData({ ...formData, hourlyWageRate: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Gang / Group Name</label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Aadhaar / ID Proof</label>
                  <input
                    type="text"
                    value={formData.idProofNumber}
                    onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Register Labourer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
