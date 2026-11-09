"use client";

// ==============================================================================
// CONSTRUCT360 MATERIAL REQUESTS & INDENTS MANAGEMENT
// 6-Step Workflow: Supervisor Indent -> PM Approve/Reject -> Storekeeper Fulfill
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  AlertCircle,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight,
  PackageCheck,
  X,
  RefreshCw,
} from "lucide-react";

export default function MaterialRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Form
  const [createForm, setCreateForm] = useState({
    projectId: "",
    siteId: "",
    priority: "NORMAL",
    dateRequired: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    items: [{ materialId: "", requestedQuantity: 10, unit: "BAGS", remarks: "" }],
  });

  // Approve Form
  const [approveForm, setApproveForm] = useState({
    sourceWarehouseId: "",
    notes: "Approved based on baseline schedule requirements.",
  });

  // Reject Form
  const [rejectForm, setRejectForm] = useState({
    rejectionReason: "Exceeds monthly BOQ allowance for current phase.",
  });

  // Fulfill Form
  const [fulfillForm, setFulfillForm] = useState({
    deliveryChallanNumber: `DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    notes: "Loaded into truck, verified by site receiver.",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, whRes, matRes, prjRes, siteRes] = await Promise.all([
        fetch("/api/v1/inventory/requests", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/inventory/warehouses", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/inventory/materials?limit=100", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/projects", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/sites", { headers: { "x-construct-csrf": "1" } }),
      ]);

      const reqData = await reqRes.json();
      const whData = await whRes.json();
      const matData = await matRes.json();
      const prjData = await prjRes.json();
      const siteData = await siteRes.json();

      if (reqData.success && reqData.data) setRequests(reqData.data);
      if (whData.success && whData.data) {
        setWarehouses(whData.data);
        if (whData.data.length > 0) {
          setApproveForm((prev) => ({ ...prev, sourceWarehouseId: whData.data[0].id }));
        }
      }
      if (matData.success && matData.data) setMaterials(matData.data);
      if (prjData.success && prjData.data) {
        setProjects(prjData.data);
        if (prjData.data.length > 0) {
          setCreateForm((prev) => ({ ...prev, projectId: prjData.data[0].id }));
        }
      }
      if (siteData.success && siteData.data) {
        setSites(siteData.data);
        if (siteData.data.length > 0) {
          setCreateForm((prev) => ({ ...prev, siteId: siteData.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load inventory requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setCreateForm({
      ...createForm,
      items: [
        ...createForm.items,
        {
          materialId: materials[0]?.id || "",
          requestedQuantity: 5,
          unit: materials[0]?.unitOfMeasurement || "BAGS",
          remarks: "",
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (createForm.items.length <= 1) return;
    setCreateForm({
      ...createForm,
      items: createForm.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...createForm.items];
    (updated[index] as any)[field] = value;
    if (field === "materialId") {
      const mat = materials.find((m) => m.id === value);
      if (mat) {
        updated[index].unit = mat.unitOfMeasurement;
      }
    }
    setCreateForm({ ...createForm, items: updated });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/inventory/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          projectId: createForm.projectId,
          siteId: createForm.siteId,
          priority: createForm.priority,
          dateRequired: new Date(createForm.dateRequired).toISOString(),
          items: createForm.items.map((it) => ({
            materialId: it.materialId || (materials[0]?.id ?? ""),
            requestedQuantity: Number(it.requestedQuantity),
            unit: it.unit,
            remarks: it.remarks || undefined,
          })),
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to create material request");

      setShowCreateModal(false);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/inventory/requests/${selectedRequest.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify(approveForm),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to approve request");

      setShowApproveModal(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/inventory/requests/${selectedRequest.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify(rejectForm),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to reject request");

      setShowRejectModal(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/inventory/requests/${selectedRequest.id}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify(fulfillForm),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to fulfill request");

      setShowFulfillModal(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
    if (search) {
      const matchCode = r.requestCode?.toLowerCase().includes(search.toLowerCase());
      const matchItems = r.items?.some((i: any) =>
        i.materialName?.toLowerCase().includes(search.toLowerCase())
      );
      if (!matchCode && !matchItems) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Submitted (Pending PM)
          </span>
        );
      case "PM_APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Approved by PM
          </span>
        );
      case "STORE_VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Layers className="w-3 h-3" /> Store Verified
          </span>
        );
      case "PARTIALLY_DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck className="w-3 h-3" /> Partially Delivered
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <PackageCheck className="w-3 h-3" /> Delivered
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="text-xs px-2 py-0.5 font-bold rounded bg-rose-500 text-white animate-pulse">URGENT</span>;
      case "HIGH":
        return <span className="text-xs px-2 py-0.5 font-semibold rounded bg-amber-500 text-white">HIGH</span>;
      case "NORMAL":
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-200 text-stone-700">NORMAL</span>;
      case "LOW":
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-100 text-stone-500">LOW</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border border-line p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded">
              Material Requisitions
            </span>
            <span className="text-xs text-stone-500">6-Step Authorized Procurement</span>
          </div>
          <h2 className="text-2xl font-bold text-ink mt-1">Site Material Indents</h2>
          <p className="text-sm text-stone-600 mt-0.5">
            Site Supervisor indents, Project Manager financial approval, Storekeeper issuance, and Delivery Challan tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-line rounded-lg hover:bg-stone-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Raise Material Indent
          </button>
        </div>
      </div>

      {/* Workflow Explainer Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-panel border border-line p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink">Indent Raised</p>
            <p className="text-stone-500">Site Engineer specifies BOM items</p>
          </div>
        </div>

        <div className="bg-panel border border-line p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink">PM Authorization</p>
            <p className="text-stone-500">Approves quantities & warehouse</p>
          </div>
        </div>

        <div className="bg-panel border border-line p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink">Store Allocation</p>
            <p className="text-stone-500">Available physical stock validated</p>
          </div>
        </div>

        <div className="bg-panel border border-line p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
            4
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink">Dispatched & Delivered</p>
            <p className="text-stone-500">DC recorded, stock ledger deducted</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-line">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by Request Code (MR-...) or Material Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-line rounded-lg text-sm bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-line rounded-lg text-sm bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PM_APPROVED">PM Approved</option>
              <option value="DELIVERED">Delivered</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-line rounded-lg text-sm bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-line rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <p className="text-sm">Loading material requisitions...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No Material Requests Found</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              No material indents match the applied filters. Click "Raise Material Indent" to submit a new requirement.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-5 hover:bg-stone-50/60 transition space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-ink">{req.requestCode}</span>
                    {getStatusBadge(req.status)}
                    {getPriorityBadge(req.priority)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      Required: <strong className="text-stone-700">{new Date(req.dateRequired).toLocaleDateString()}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Created: {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Indent Details Bar */}
                <div className="bg-stone-50 border border-stone-200/60 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-stone-500 block">Assigned Site</span>
                    <span className="font-semibold text-stone-800">{req.siteName || "Site Work Area"}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Requested Items</span>
                    <span className="font-semibold text-stone-800">{req.items?.length || 0} Materials</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Source Warehouse</span>
                    <span className="font-semibold text-stone-800">
                      {req.sourceWarehouseName || (req.sourceWarehouseId ? "Allocated" : "Unassigned")}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Challan / Ref</span>
                    <span className="font-mono font-semibold text-stone-800">
                      {req.deliveryChallanNumber || "Pending Dispatch"}
                    </span>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-line rounded-lg">
                    <thead className="bg-stone-100/80 text-stone-600 font-medium">
                      <tr>
                        <th className="py-2 px-3">Material</th>
                        <th className="py-2 px-3 text-right">Requested Qty</th>
                        <th className="py-2 px-3 text-right">Approved Qty</th>
                        <th className="py-2 px-3 text-right">Issued Qty</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-white">
                      {req.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-stone-50/50">
                          <td className="py-2 px-3 font-medium text-stone-800">
                            {item.materialName || item.materialCode || item.materialId}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-stone-800">
                            {Number(item.requestedQuantity).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-stone-600">
                            {item.approvedQuantity !== undefined ? Number(item.approvedQuantity).toLocaleString() : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {item.issuedQuantity !== undefined ? Number(item.issuedQuantity).toLocaleString() : "0"}
                          </td>
                          <td className="py-2 px-3 text-stone-500">{item.unit}</td>
                          <td className="py-2 px-3 text-stone-500 italic">{item.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions Based on Workflow Role */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                  <div className="text-xs text-stone-500">
                    {req.status === "SUBMITTED" && "Awaiting Project Manager review and budget sign-off."}
                    {req.status === "PM_APPROVED" && "Authorized for fulfillment by Central/Project Storekeeper."}
                    {req.status === "DELIVERED" && "Physical materials delivered and acknowledged on-site."}
                    {req.status === "REJECTED" && "Request rejected. Reason recorded in audit trail."}
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "SUBMITTED" && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowRejectModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setShowApproveModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-sm transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Indent
                        </button>
                      </>
                    )}

                    {req.status === "PM_APPROVED" && (
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setShowFulfillModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Fulfill & Issue Stock
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CREATE MATERIAL REQUEST */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-panel border border-line rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Raise Site Material Indent</h3>
                  <p className="text-xs text-stone-500">Site Supervisor Requisition for Central/Project Stores</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Target Project</label>
                  <select
                    value={createForm.projectId}
                    onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Target Site / Tower</label>
                  <select
                    value={createForm.siteId}
                    onChange={(e) => setCreateForm({ ...createForm, siteId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="LOW">Low - General Replenishment</option>
                    <option value="NORMAL">Normal - Next 3-5 Days</option>
                    <option value="HIGH">High - Next 48 Hours</option>
                    <option value="URGENT">Urgent - Work Stopping Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Required On Site By</label>
                  <input
                    type="date"
                    value={createForm.dateRequired}
                    onChange={(e) => setCreateForm({ ...createForm, dateRequired: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                  </input>
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="border border-line rounded-xl p-4 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">Requested Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-accent font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>

                {createForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-line">
                    <div className="col-span-5">
                      <label className="block text-[10px] text-stone-500 mb-0.5">Material</label>
                      <select
                        value={item.materialId}
                        onChange={(e) => handleItemChange(idx, "materialId", e.target.value)}
                        className="w-full px-2 py-1.5 border border-line rounded text-xs bg-white focus:outline-none"
                      >
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.materialCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] text-stone-500 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.requestedQuantity}
                        onChange={(e) => handleItemChange(idx, "requestedQuantity", e.target.value)}
                        className="w-full px-2 py-1.5 border border-line rounded text-xs bg-white text-right font-mono"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="block text-[10px] text-stone-500 mb-0.5">Unit</label>
                      <input
                        type="text"
                        readOnly
                        value={item.unit}
                        className="w-full px-2 py-1.5 border border-line rounded text-xs bg-stone-100 text-stone-600"
                      />
                    </div>

                    <div className="col-span-1 pt-4 text-center">
                      <button
                        type="button"
                        disabled={createForm.items.length <= 1}
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-line rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-sm transition"
                >
                  {submitting ? "Submitting Indent..." : "Submit Material Indent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE REQUEST */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-panel border border-line rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Approve Material Request</h3>
                  <p className="text-xs text-stone-500">{selectedRequest.requestCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowApproveModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Assign Fulfilling Warehouse
                </label>
                <select
                  value={approveForm.sourceWarehouseId}
                  onChange={(e) => setApproveForm({ ...approveForm, sourceWarehouseId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.warehouseType})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  The warehouse responsible for picking, packing, and dispatching this material.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Project Manager Approval Notes</label>
                <textarea
                  rows={3}
                  value={approveForm.notes}
                  onChange={(e) => setApproveForm({ ...approveForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-line rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  {submitting ? "Approving..." : "Confirm PM Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REQUEST */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-panel border border-line rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Reject Material Request</h3>
                  <p className="text-xs text-stone-500">{selectedRequest.requestCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Reason for Rejection</label>
                <textarea
                  rows={3}
                  value={rejectForm.rejectionReason}
                  onChange={(e) => setRejectForm({ ...rejectForm, rejectionReason: e.target.value })}
                  required
                  placeholder="Detail why this material request cannot be approved at this time..."
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-line rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
                >
                  {submitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FULFILL AND ISSUE MATERIAL */}
      {showFulfillModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-panel border border-line rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Storekeeper Stock Fulfillment</h3>
                  <p className="text-xs text-stone-500">Record Delivery Challan & Deduct Stock Ledger</p>
                </div>
              </div>
              <button
                onClick={() => setShowFulfillModal(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="p-3 bg-stone-100/70 rounded-lg text-xs text-stone-700 space-y-1">
                <p>
                  <strong>Request Code:</strong> {selectedRequest.requestCode}
                </p>
                <p>
                  <strong>Total Items to Dispatch:</strong> {selectedRequest.items?.length || 0} line items
                </p>
                <p className="text-stone-500">
                  Confirming dispatch will deduct on-hand quantities from warehouse inventory and record permanent
                  ledger entries.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Challan Number</label>
                <input
                  type="text"
                  required
                  value={fulfillForm.deliveryChallanNumber}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, deliveryChallanNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Gate Pass & Dispatch Remarks</label>
                <textarea
                  rows={2}
                  value={fulfillForm.notes}
                  onChange={(e) => setFulfillForm({ ...fulfillForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowFulfillModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-line rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  {submitting ? "Issuing..." : "Confirm Dispatch & Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
