"use client";

// ==============================================================================
// CONSTRUCT360 PROJECT FINANCIALS & BUDGET VARIANCE OVERVIEW
// Approved Budget, Expense Breakdown Across Categories & Live Ledger
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  IndianRupee,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
  Building,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  X,
  PieChart,
} from "lucide-react";

interface ExpenseItem {
  id: string;
  projectId: string;
  costCategory: "LABOUR" | "MATERIAL" | "EQUIPMENT" | "CONTRACTOR" | "PERMITS_OVERHEAD";
  title: string;
  amount: number;
  date: string;
  referenceType?: string;
  referenceId?: string;
  vendorOrBeneficiary: string;
  notes?: string;
}

interface FinancialData {
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
  expenses: ExpenseItem[];
}

export default function ProjectFinancials({ projectId }: { projectId: string }) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [expenseForm, setExpenseForm] = useState({
    costCategory: "MATERIAL" as const,
    title: "",
    amount: 50000,
    date: new Date().toISOString().split("T")[0],
    referenceType: "MATERIAL_PO" as const,
    referenceId: "",
    vendorOrBeneficiary: "",
    notes: "",
  });

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/financials`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [projectId]);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/financials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          costCategory: expenseForm.costCategory,
          title: expenseForm.title.trim(),
          amount: Number(expenseForm.amount),
          date: expenseForm.date,
          referenceType: expenseForm.referenceType,
          referenceId: expenseForm.referenceId.trim() || undefined,
          vendorOrBeneficiary: expenseForm.vendorOrBeneficiary.trim(),
          notes: expenseForm.notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowExpenseModal(false);
        setExpenseForm({
          costCategory: "MATERIAL",
          title: "",
          amount: 50000,
          date: new Date().toISOString().split("T")[0],
          referenceType: "MATERIAL_PO",
          referenceId: "",
          vendorOrBeneficiary: "",
          notes: "",
        });
        await fetchFinancials();
      } else {
        alert(json.error?.message || "Failed to record expense");
      }
    } catch (err: any) {
      alert(err?.message || "Error recording expense");
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

  if (loading && !data) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs font-medium text-muted">Calculating real-time financial variance...</p>
      </div>
    );
  }

  if (!data) return null;

  const categories = [
    { label: "Direct Labour Cost", value: data.labourCost, color: "bg-sky-600" },
    { label: "Material Procurement", value: data.materialCost, color: "bg-emerald-600" },
    { label: "Plant & Heavy Equipment", value: data.equipmentCost, color: "bg-amber-600" },
    { label: "Subcontractor RA Billing", value: data.contractorCost, color: "bg-purple-600" },
    { label: "Permits, NOC & Overhead", value: data.overheadCost, color: "bg-stone/80" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-accent" />
            Project Financial Performance & Budget Variance Analysis
          </h2>
          <p className="text-xs text-muted">
            Track multi-category expenses against approved baseline, contingency envelope & cost overrun indicators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFinancials()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Ledger
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Record Project Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">
            Approved Baseline Budget
          </span>
          <span className="mt-1 text-lg font-bold text-ink block">
            {formatCurrency(data.approvedBudget)}
          </span>
          <span className="text-[11px] text-muted font-medium mt-1 block">
            Contract: {formatCurrency(data.contractValue)}
          </span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">
            Total Actual Expenses
          </span>
          <span className="mt-1 text-lg font-bold text-ink block">
            {formatCurrency(data.totalActualExpenses)}
          </span>
          <span className="text-[11px] text-muted font-medium mt-1 block">
            {data.approvedBudget > 0
              ? `${Math.round((data.totalActualExpenses / data.approvedBudget) * 100)}% of Budget Spent`
              : "0%"}
          </span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">
            Remaining Budget Envelope
          </span>
          <span
            className={`mt-1 text-lg font-bold block ${
              data.remainingBudget >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {formatCurrency(data.remainingBudget)}
          </span>
          <span className="text-[11px] text-muted font-medium mt-1 block">
            Variance: {data.budgetVariancePercent}%
          </span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">
            Cost Overrun Risk
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                data.costOverrunRisk === "CRITICAL"
                  ? "bg-rose-600 text-white"
                  : data.costOverrunRisk === "HIGH"
                  ? "bg-rose-100 text-rose-800"
                  : data.costOverrunRisk === "MODERATE"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {data.costOverrunRisk} RISK
            </span>
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {data.costOverrunRisk === "LOW" ? "Within budget parameters" : "Monitor spending closely"}
          </span>
        </div>
      </div>

      {/* Category Cost Breakdown */}
      <div className="rounded-lg border border-line bg-panel p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
          <PieChart className="h-4 w-4 text-accent" />
          5-Category Construction Expense Allocation
        </h3>

        {/* Stacked Bar */}
        <div className="h-3 w-full rounded-full bg-stone/40 overflow-hidden flex">
          {categories.map((c, i) => {
            const width = data.totalActualExpenses > 0
              ? (c.value / data.totalActualExpenses) * 100
              : 0;
            return (
              <div
                key={i}
                className={`h-full ${c.color} transition-all`}
                style={{ width: `${width}%` }}
                title={`${c.label}: ${formatCurrency(c.value)} (${Math.round(width)}%)`}
              />
            );
          })}
        </div>

        {/* Category Legend & Values */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 text-xs">
          {categories.map((c, i) => {
            const percent = data.totalActualExpenses > 0
              ? Math.round((c.value / data.totalActualExpenses) * 100)
              : 0;
            return (
              <div key={i} className="border-l-2 pl-2 border-line">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                  <span className="text-[11px] font-semibold text-muted">{c.label}</span>
                </div>
                <div className="font-bold text-ink mt-0.5">{formatCurrency(c.value)}</div>
                <div className="text-[10px] text-muted">{percent}% of total expenses</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
        <div className="bg-canvas px-4 py-2.5 border-b border-line flex items-center justify-between text-xs font-bold text-ink">
          <span>Project Expense Ledger ({data.expenses.length} Entries)</span>
          <span className="text-muted text-[11px] font-normal">
            Total Spent: {formatCurrency(data.totalActualExpenses)}
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas/40 border-b border-line text-[10px] font-bold text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Expense Title / Description</th>
              <th className="px-3 py-2.5">Vendor / Beneficiary</th>
              <th className="px-3 py-2.5">Reference</th>
              <th className="px-4 py-2.5 text-right">Amount (INR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {data.expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No project expenses booked yet. Click &quot;Record Project Expense&quot; to book costs.
                </td>
              </tr>
            ) : (
              data.expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-ink">
                    {new Date(exp.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-[9px] font-bold">
                      {exp.costCategory}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink">
                    {exp.title}
                    {exp.notes && (
                      <span className="block text-[10px] font-normal text-muted truncate max-w-xs">
                        {exp.notes}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted font-medium">
                    {exp.vendorOrBeneficiary}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted">
                    {exp.referenceType || "VOUCHER"}
                    {exp.referenceId && ` #${exp.referenceId}`}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-ink">
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Record Project Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Receipt className="h-4 w-4 text-accent" />
                Book Project Expense Entry
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Cost Category *</label>
                <select
                  value={expenseForm.costCategory}
                  onChange={(e) => setExpenseForm({ ...expenseForm, costCategory: e.target.value as any })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="MATERIAL">Material Procurement</option>
                  <option value="LABOUR">Direct Labour Wages</option>
                  <option value="EQUIPMENT">Plant & Equipment Rental / Fuel</option>
                  <option value="CONTRACTOR">Subcontractor RA Bill Payment</option>
                  <option value="PERMITS_OVERHEAD">Permits, NOC & Site Overheads</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fe500D TMT Rebar Batch 04 Delivery"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Amount (INR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Reference Type</label>
                  <select
                    value={expenseForm.referenceType}
                    onChange={(e) => setExpenseForm({ ...expenseForm, referenceType: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="MATERIAL_PO">Material PO</option>
                    <option value="CONTRACTOR_BILL">Contractor Bill</option>
                    <option value="LABOUR_PAYROLL">Labour Payroll</option>
                    <option value="EQUIPMENT_RENTAL">Equipment Rental</option>
                    <option value="DIRECT_VOUCHER">Direct Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Voucher / PO Ref #</label>
                  <input
                    type="text"
                    placeholder="PO-2026-089"
                    value={expenseForm.referenceId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, referenceId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Vendor / Beneficiary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Steel BSL Ltd"
                  value={expenseForm.vendorOrBeneficiary}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorOrBeneficiary: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Booking..." : "Book Expense Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
