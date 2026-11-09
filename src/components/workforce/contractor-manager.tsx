"use client";

// ==============================================================================
// CONSTRUCT360 LABOUR CONTRACTORS & SUBCONTRACTOR BILLING
// Contractor Directory, Agreement Rates, RA Bills Submission, Approvals & Payments
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  Briefcase,
  UserPlus,
  Search,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  X,
  AlertCircle,
  Building,
  Phone,
  Mail,
  Receipt,
  CreditCard,
  TrendingDown,
  Calendar,
  Layers,
} from "lucide-react";

interface Contractor {
  id: string;
  contractorCode: string;
  businessName: string;
  contractorType: string;
  contactPerson: string;
  phone: string;
  email?: string;
  contractValidFrom: string;
  contractValidTo: string;
  activeLabourCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  isActive: boolean;
  bills?: any[];
  payments?: any[];
}

export default function ContractorManager() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  // Selected Contractor Profile Drawer
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [targetBillId, setTargetBillId] = useState<string | null>(null);

  // Action status
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create Contractor Form
  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    phone: "",
    email: "",
    contractorType: "LABOUR_SUPPLIER",
    contractValidFrom: new Date().toISOString().slice(0, 10),
    contractValidTo: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    panNumber: "",
    taxId: "",
    address: "",
  });

  // Submit RA Bill Form
  const [billData, setBillData] = useState({
    billNumber: "RA-BILL-" + Math.floor(100 + Math.random() * 900),
    periodStartDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    periodEndDate: new Date().toISOString().slice(0, 10),
    mandaysCount: 320,
    grossAmount: 288000,
    deductionsAmount: 14400,
    notes: "Fortnightly labour supply running account bill",
  });

  // Record Payment Form
  const [paymentData, setPaymentData] = useState({
    amount: 150000,
    paymentMode: "BANK_TRANSFER",
    referenceNumber: "UTR" + Math.floor(10000000 + Math.random() * 90000000),
    notes: "Direct NEFT settlement against verified RA bill",
  });

  const fetchContractors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.append("search", search);
      if (filterType !== "ALL") params.append("contractorType", filterType);

      const res = await fetch(`/api/v1/workforce/contractors?${params.toString()}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setContractors(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, [search, filterType]);

  const openDrawer = async (id: string) => {
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/v1/workforce/contractors/${id}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedContractor(json.data);
      }
    } catch {
    } finally {
      setDrawerLoading(false);
    }
  };

  // Create Contractor
  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/workforce/contractors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          businessName: formData.businessName.trim(),
          contactPerson: formData.contactPerson.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          contractorType: formData.contractorType,
          contractValidFrom: formData.contractValidFrom,
          contractValidTo: formData.contractValidTo,
          panNumber: formData.panNumber.trim() || undefined,
          taxId: formData.taxId.trim() || undefined,
          address: formData.address.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        fetchContractors();
        setActionMessage({
          type: "success",
          text: `Contractor registered successfully: ${json.data.contractorCode}`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: json.error?.message || "Failed to register contractor",
        });
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err?.message || "Error creating contractor" });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit RA Bill
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/workforce/contractors/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          contractorId: selectedContractor.id,
          billNumber: billData.billNumber.trim(),
          periodStartDate: billData.periodStartDate,
          periodEndDate: billData.periodEndDate,
          mandaysCount: Number(billData.mandaysCount),
          grossAmount: Number(billData.grossAmount),
          deductionsAmount: Number(billData.deductionsAmount),
          notes: billData.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowBillModal(false);
        openDrawer(selectedContractor.id);
        fetchContractors();
        setActionMessage({
          type: "success",
          text: `Bill ${billData.billNumber} submitted for verification.`,
        });
      }
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  // Review RA Bill (Approve / Reject)
  const handleReviewBill = async (billId: string, status: "APPROVED" | "REJECTED") => {
    if (!selectedContractor) return;
    try {
      const res = await fetch("/api/v1/workforce/contractors/bills", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          billId,
          status,
          notes: status === "APPROVED" ? "Site Engineer verified mandays" : "Manday discrepancy found",
        }),
      });
      const json = await res.json();
      if (json.success) {
        openDrawer(selectedContractor.id);
        fetchContractors();
      }
    } catch {}
  };

  // Record Disbursal Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor || !targetBillId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/v1/workforce/contractors/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          billId: targetBillId,
          amount: Number(paymentData.amount),
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMode: paymentData.paymentMode,
          referenceNumber: paymentData.referenceNumber,
          notes: paymentData.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPaymentModal(false);
        openDrawer(selectedContractor.id);
        fetchContractors();
        setActionMessage({
          type: "success",
          text: `Payment of ₹${paymentData.amount.toLocaleString()} logged successfully.`,
        });
      }
    } catch {
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Subcontractor Agreements & Billing Vault
          </h2>
          <p className="text-xs text-muted">
            Agency contracts, trade rate schedules, periodic RA bills, retention funds, and payment vouchers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 transition-colors shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5 text-accent" />
            Register Contractor
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by contractor agency, code (e.g. CONT-01), or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-hidden focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
          >
            <option value="ALL">All Contractor Types</option>
            <option value="LABOUR_SUPPLIER">Labour Supplier</option>
            <option value="CIVIL_SUBCONTRACTOR">Civil Subcontractor</option>
            <option value="ELECTRICAL_SUBCONTRACTOR">Electrical Subcontractor</option>
            <option value="PLUMBING_SUBCONTRACTOR">Plumbing Subcontractor</option>
            <option value="STEEL_FABRICATION">Steel Fabrication</option>
            <option value="FORMWORK_SHUTTERING">Formwork & Shuttering</option>
          </select>
        </div>
      </div>

      {/* Contractor Table */}
      <div className="rounded-lg border border-line bg-panel shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-muted uppercase text-[10px] font-semibold">
                <th className="py-2.5 px-3">Contractor / Agency</th>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3 text-center">Active Workers</th>
                <th className="py-2.5 px-3 text-right">Total Billed</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {contractors.map((c) => (
                <tr key={c.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-ink">{c.businessName}</div>
                    <div className="text-[10px] text-muted">
                      Valid till: {c.contractValidTo}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-accent">
                    {c.contractorCode}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded bg-stone/40 px-2 py-0.5 font-mono text-[10px] text-ink font-medium">
                      {c.contractorType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-ink font-medium">{c.contactPerson}</div>
                    <div className="text-[11px] text-muted">{c.phone}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-ink">
                    {c.activeLabourCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted">
                    {formatCurrency(c.totalBilled)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                    {formatCurrency(c.totalOutstanding)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => openDrawer(c.id)}
                      className="inline-flex items-center gap-1 rounded border border-line bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-stone/20 transition-colors"
                    >
                      <Receipt className="h-3 w-3 text-accent" />
                      Ledger & Bills
                    </button>
                  </td>
                </tr>
              ))}
              {contractors.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No subcontractors or labour agencies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contractor Ledger & Bills Drawer */}
      {selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-line bg-panel shadow-xl overflow-hidden">
            {/* Drawer Top */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-canvas">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {selectedContractor.businessName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-mono font-bold text-accent">
                      {selectedContractor.contractorCode}
                    </span>
                    <span>&bull;</span>
                    <span>{selectedContractor.contractorType}</span>
                    <span>&bull;</span>
                    <span>Contact: {selectedContractor.contactPerson} ({selectedContractor.phone})</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedContractor(null)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  {/* Financial Balance Summary Strip */}
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-line bg-canvas p-4">
                    <div>
                      <span className="text-[10px] uppercase text-muted font-semibold block">Total Billed</span>
                      <span className="text-lg font-bold font-mono text-ink">
                        {formatCurrency(selectedContractor.totalBilled)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted font-semibold block">Disbursed / Paid</span>
                      <span className="text-lg font-bold font-mono text-emerald-800">
                        {formatCurrency(selectedContractor.totalPaid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted font-semibold block">Net Outstanding</span>
                      <span className="text-lg font-bold font-mono text-amber-800">
                        {formatCurrency(selectedContractor.totalOutstanding)}
                      </span>
                    </div>
                  </div>

                  {/* Periodic RA Bills Section */}
                  <div className="rounded-md border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                          Running Account (RA) Bills
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowBillModal(true)}
                        className="flex items-center gap-1 rounded bg-ink px-2.5 py-1 text-[11px] font-medium text-canvas hover:bg-ink/90"
                      >
                        <FileText className="h-3 w-3 text-accent" />
                        Submit RA Bill
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedContractor.bills && selectedContractor.bills.length > 0 ? (
                        selectedContractor.bills.map((bill: any) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between rounded border border-line/60 bg-panel px-3 py-2.5 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2 font-mono font-bold text-ink">
                                <span>{bill.billNumber}</span>
                                <span
                                  className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                                    bill.status === "PAID"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : bill.status === "APPROVED"
                                      ? "bg-blue-100 text-blue-800"
                                      : bill.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {bill.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted mt-0.5">
                                Period: {bill.billingPeriodStart} to {bill.billingPeriodEnd} &bull; {bill.mandaysCount} mandays
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-mono font-bold text-ink">
                                  {formatCurrency(bill.netPayable)}
                                </div>
                                <div className="text-[10px] text-muted">
                                  Gross: {formatCurrency(bill.grossAmount)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {bill.status === "SUBMITTED" && (
                                  <>
                                    <button
                                      onClick={() => handleReviewBill(bill.id, "APPROVED")}
                                      className="rounded bg-emerald-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-800"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleReviewBill(bill.id, "REJECTED")}
                                      className="rounded bg-red-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-800"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {bill.status === "APPROVED" && (
                                  <button
                                    onClick={() => {
                                      setTargetBillId(bill.id);
                                      setPaymentData({
                                        ...paymentData,
                                        amount: bill.netPayable,
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className="rounded bg-accent px-2.5 py-1 text-[10px] font-semibold text-canvas hover:bg-accent/90"
                                  >
                                    Record Payment
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No RA bills submitted yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="rounded-md border border-line bg-canvas p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="h-4 w-4 text-accent" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                        Disbursal & Payment History
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {selectedContractor.payments && selectedContractor.payments.length > 0 ? (
                        selectedContractor.payments.map((pmt: any) => (
                          <div
                            key={pmt.id}
                            className="flex items-center justify-between rounded border border-line/60 bg-panel px-3 py-2 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-ink">
                                Mode: {pmt.paymentMode} &bull; Ref: <span className="font-mono">{pmt.transactionReference || "N/A"}</span>
                              </div>
                              <div className="text-[10px] text-muted">
                                Disbursed on {pmt.paymentDate}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-emerald-800">
                              {formatCurrency(pmt.amount)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted">No payment transactions recorded.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Contractor */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-lg border border-line bg-panel p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink">Register Labour Contractor / Agency</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-muted hover:bg-stone/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Contractor Type *</label>
                  <select
                    value={formData.contractorType}
                    onChange={(e) => setFormData({ ...formData, contractorType: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  >
                    <option value="LABOUR_SUPPLIER">Labour Supplier</option>
                    <option value="CIVIL_SUBCONTRACTOR">Civil Subcontractor</option>
                    <option value="ELECTRICAL_SUBCONTRACTOR">Electrical Subcontractor</option>
                    <option value="PLUMBING_SUBCONTRACTOR">Plumbing Subcontractor</option>
                    <option value="STEEL_FABRICATION">Steel Fabrication</option>
                    <option value="FORMWORK_SHUTTERING">Formwork & Shuttering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">PAN / Tax ID</label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Agreement Start *</label>
                  <input
                    type="date"
                    required
                    value={formData.contractValidFrom}
                    onChange={(e) => setFormData({ ...formData, contractValidFrom: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Agreement Expiry *</label>
                  <input
                    type="date"
                    required
                    value={formData.contractValidTo}
                    onChange={(e) => setFormData({ ...formData, contractValidTo: e.target.value })}
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
                  Register Agency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit RA Bill */}
      {showBillModal && selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-3">
              Submit Periodic RA Bill: {selectedContractor.businessName}
            </h3>
            <form onSubmit={handleSubmitBill} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Bill Reference *</label>
                  <input
                    type="text"
                    required
                    value={billData.billNumber}
                    onChange={(e) => setBillData({ ...billData, billNumber: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Mandays Count *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={billData.mandaysCount}
                    onChange={(e) => setBillData({ ...billData, mandaysCount: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Gross Bill Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={billData.grossAmount}
                    onChange={(e) => setBillData({ ...billData, grossAmount: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Retention / Deductions (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={billData.deductionsAmount}
                    onChange={(e) => setBillData({ ...billData, deductionsAmount: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={billData.notes}
                  onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
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
                  Submit Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Disbursal Payment */}
      {showPaymentModal && selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-3">
              Record Contractor Payment Disbursal
            </h3>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">Payment Mode *</label>
                  <select
                    value={paymentData.paymentMode}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink mb-1">UTR / Ref Number *</label>
                  <input
                    type="text"
                    required
                    value={paymentData.referenceNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink mb-1">Remarks</label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
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
                  Confirm Disbursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
