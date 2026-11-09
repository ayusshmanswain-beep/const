"use client";

// ==============================================================================
// CONSTRUCT360 STOCK OPERATIONS WORKBENCH
// Inward GRN Receipts, Site Issues, Returns, Wastage/Damage & Audit Reconciliation
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertOctagon,
  Scale,
  RefreshCw,
  CheckCircle2,
  Building,
  Boxes,
  Truck,
  FileCheck2,
} from "lucide-react";
import type { MaterialWithStock } from "@/server/modules/inventory/inventory.types";
import type { DbWarehouse } from "@/server/db/types";

export default function StockOperations() {
  const [activeTab, setActiveTab] = useState<"grn" | "issue" | "return" | "damage" | "reconcile">("grn");
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [warehouses, setWarehouses] = useState<DbWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forms
  const [grnForm, setGrnForm] = useState({
    warehouseId: "",
    materialId: "",
    quantity: 100,
    unitCost: 380,
    supplierName: "",
    purchaseOrderRef: "",
    grnNumber: "",
    batchNumber: "",
    remarks: "",
  });

  const [issueForm, setIssueForm] = useState({
    warehouseId: "",
    materialId: "",
    quantity: 50,
    issuedToPersonName: "",
    referenceNumber: "",
    remarks: "",
  });

  const [returnForm, setReturnForm] = useState({
    warehouseId: "",
    materialId: "",
    quantity: 10,
    returnReason: "Excess unused material after completion of footing casting",
    remarks: "",
  });

  const [damageForm, setDamageForm] = useState({
    warehouseId: "",
    materialId: "",
    quantity: 5,
    isDamage: true,
    rootCause: "Water ingress during heavy rainfall spoiled cement bags",
    remarks: "",
  });

  const [reconcileForm, setReconcileForm] = useState({
    warehouseId: "",
    materialId: "",
    actualPhysicalQuantity: 0,
    adjustmentReason: "Quarterly physical stock verification count",
    remarks: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, whRes] = await Promise.all([
        fetch("/api/v1/inventory/materials?limit=200", { headers: { "x-construct-csrf": "1" } }),
        fetch("/api/v1/inventory/warehouses", { headers: { "x-construct-csrf": "1" } }),
      ]);
      const matJson = await matRes.json();
      const whJson = await whRes.json();

      if (matJson.success) setMaterials(matJson.data);
      if (whJson.success) {
        setWarehouses(whJson.data);
        if (whJson.data.length > 0) {
          setGrnForm((f) => ({ ...f, warehouseId: whJson.data[0].id }));
          setIssueForm((f) => ({ ...f, warehouseId: whJson.data[0].id }));
          setReturnForm((f) => ({ ...f, warehouseId: whJson.data[0].id }));
          setDamageForm((f) => ({ ...f, warehouseId: whJson.data[0].id }));
          setReconcileForm((f) => ({ ...f, warehouseId: whJson.data[0].id }));
        }
      }
      if (matJson.success && matJson.data.length > 0) {
        setGrnForm((f) => ({ ...f, materialId: matJson.data[0].id, unitCost: matJson.data[0].standardRate }));
        setIssueForm((f) => ({ ...f, materialId: matJson.data[0].id }));
        setReturnForm((f) => ({ ...f, materialId: matJson.data[0].id }));
        setDamageForm((f) => ({ ...f, materialId: matJson.data[0].id }));
        setReconcileForm((f) => ({ ...f, materialId: matJson.data[0].id, actualPhysicalQuantity: matJson.data[0].totalQuantityOnHand }));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/inventory/operations/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          ...grnForm,
          quantity: Number(grnForm.quantity),
          unitCost: Number(grnForm.unitCost),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`GRN recorded successfully! Ref: ${json.data.ledger.referenceNumber}`);
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to record GRN");
      }
    } catch (err: any) {
      alert(err?.message || "Error submitting GRN");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/inventory/operations/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          ...issueForm,
          quantity: Number(issueForm.quantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Material issued successfully! Ref: ${json.data.ledger.referenceNumber}`);
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to issue material");
      }
    } catch (err: any) {
      alert(err?.message || "Error issuing material");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/inventory/operations/return", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          ...returnForm,
          quantity: Number(returnForm.quantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Material returned to store! Ref: ${json.data.ledger.referenceNumber}`);
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to return material");
      }
    } catch (err: any) {
      alert(err?.message || "Error processing return");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/inventory/operations/damage-wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          ...damageForm,
          quantity: Number(damageForm.quantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Wastage/Damage written off! Ref: ${json.data.ledger.referenceNumber}`);
        await fetchData();
      } else {
        alert(json.error?.message || "Failed to write off wastage/damage");
      }
    } catch (err: any) {
      alert(err?.message || "Error processing write-off");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/v1/inventory/operations/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          ...reconcileForm,
          actualPhysicalQuantity: Number(reconcileForm.actualPhysicalQuantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Stock reconciled! Adjustment Ref: ${json.data.ledger.referenceNumber}`);
        await fetchData();
      } else {
        alert(json.error?.message || "Reconciliation failed");
      }
    } catch (err: any) {
      alert(err?.message || "Error reconciling stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab("grn");
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "grn"
                ? "bg-ink text-canvas shadow-xs font-bold"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
            Inward GRN Receipt
          </button>

          <button
            onClick={() => {
              setActiveTab("issue");
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "issue"
                ? "bg-ink text-canvas shadow-xs font-bold"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
            Site Issue
          </button>

          <button
            onClick={() => {
              setActiveTab("return");
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "return"
                ? "bg-ink text-canvas shadow-xs font-bold"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 text-sky-500" />
            Site Return
          </button>

          <button
            onClick={() => {
              setActiveTab("damage");
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "damage"
                ? "bg-ink text-canvas shadow-xs font-bold"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            Wastage & Damage
          </button>

          <button
            onClick={() => {
              setActiveTab("reconcile");
              setSuccessMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "reconcile"
                ? "bg-ink text-canvas shadow-xs font-bold"
                : "text-muted hover:text-ink hover:bg-stone/30"
            }`}
          >
            <Scale className="h-3.5 w-3.5 text-purple-500" />
            Stock Reconciliation
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Operation Forms Container */}
      <div className="rounded-lg border border-line bg-panel p-6 shadow-xs max-w-2xl">
        {/* Form 1: Goods Receipt Note (GRN) */}
        {activeTab === "grn" && (
          <form onSubmit={handleGRN} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Goods Receipt Note (GRN Inward Stock)</h3>
              <p className="text-xs text-muted">
                Record supplier delivery into warehouse with invoice rates and batch details
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Receiving Warehouse *</label>
                <select
                  required
                  value={grnForm.warehouseId}
                  onChange={(e) => setGrnForm({ ...grnForm, warehouseId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Material SKU *</label>
                <select
                  required
                  value={grnForm.materialId}
                  onChange={(e) => {
                    const mat = materials.find((m) => m.id === e.target.value);
                    setGrnForm({
                      ...grnForm,
                      materialId: e.target.value,
                      unitCost: mat?.standardRate || grnForm.unitCost,
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name} ({m.unitOfMeasurement})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Received Quantity *</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={grnForm.quantity}
                  onChange={(e) => setGrnForm({ ...grnForm, quantity: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Invoice Unit Cost (INR) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={grnForm.unitCost}
                  onChange={(e) => setGrnForm({ ...grnForm, unitCost: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement Ltd"
                  value={grnForm.supplierName}
                  onChange={(e) => setGrnForm({ ...grnForm, supplierName: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">PO / Delivery Challan Ref #</label>
                <input
                  type="text"
                  placeholder="PO-2026-0044"
                  value={grnForm.purchaseOrderRef}
                  onChange={(e) => setGrnForm({ ...grnForm, purchaseOrderRef: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Batch / Heat / Lot Number</label>
              <input
                type="text"
                placeholder="e.g. CEM-2026-W08 or HEAT-4482"
                value={grnForm.batchNumber}
                onChange={(e) => setGrnForm({ ...grnForm, batchNumber: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-ink px-4 py-2 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
            >
              {submitting ? "Booking GRN..." : "Confirm Inward GRN Receipt"}
            </button>
          </form>
        )}

        {/* Form 2: Material Issue */}
        {activeTab === "issue" && (
          <form onSubmit={handleIssue} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Material Issue to Construction Site</h3>
              <p className="text-xs text-muted">
                Issue materials from warehouse to site supervisor, subcontractor or work gang
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Source Warehouse *</label>
                <select
                  required
                  value={issueForm.warehouseId}
                  onChange={(e) => setIssueForm({ ...issueForm, warehouseId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Material SKU *</label>
                <select
                  required
                  value={issueForm.materialId}
                  onChange={(e) => setIssueForm({ ...issueForm, materialId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name} (Avail: {m.totalAvailableQuantity} {m.unitOfMeasurement})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Issue Quantity *</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Recipient Person / Gang *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Barbending Gang 2"
                  value={issueForm.issuedToPersonName}
                  onChange={(e) => setIssueForm({ ...issueForm, issuedToPersonName: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Issue Purpose & Site Zone Remarks</label>
              <textarea
                rows={2}
                placeholder="For Tower A Level 4 Column Shuttering and Concreting"
                value={issueForm.remarks}
                onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-ink px-4 py-2 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
            >
              {submitting ? "Issuing..." : "Confirm Material Issue"}
            </button>
          </form>
        )}

        {/* Form 3: Site Return */}
        {activeTab === "return" && (
          <form onSubmit={handleReturn} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Material Return from Construction Site</h3>
              <p className="text-xs text-muted">
                Accept unconsumed, surplus or serviceable material returned back to warehouse
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Return to Warehouse *</label>
                <select
                  required
                  value={returnForm.warehouseId}
                  onChange={(e) => setReturnForm({ ...returnForm, warehouseId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Material SKU *</label>
                <select
                  required
                  value={returnForm.materialId}
                  onChange={(e) => setReturnForm({ ...returnForm, materialId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Return Quantity *</label>
              <input
                type="number"
                min="0.001"
                step="any"
                required
                value={returnForm.quantity}
                onChange={(e) => setReturnForm({ ...returnForm, quantity: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Reason for Return *</label>
              <input
                type="text"
                required
                value={returnForm.returnReason}
                onChange={(e) => setReturnForm({ ...returnForm, returnReason: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-ink px-4 py-2 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm Return Receipt"}
            </button>
          </form>
        )}

        {/* Form 4: Wastage & Damage */}
        {activeTab === "damage" && (
          <form onSubmit={handleDamage} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Damaged Material & Scrap Wastage Write-Off</h3>
              <p className="text-xs text-muted">
                De-stock spoiled material, weather damage or rebar cut-piece wastage
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Warehouse *</label>
                <select
                  required
                  value={damageForm.warehouseId}
                  onChange={(e) => setDamageForm({ ...damageForm, warehouseId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Material SKU *</label>
                <select
                  required
                  value={damageForm.materialId}
                  onChange={(e) => setDamageForm({ ...damageForm, materialId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Classification</label>
                <select
                  value={damageForm.isDamage ? "DAMAGE" : "WASTAGE"}
                  onChange={(e) => setDamageForm({ ...damageForm, isDamage: e.target.value === "DAMAGE" })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  <option value="DAMAGE">Damaged / Broken / Spoiled (Quarantine Scrap)</option>
                  <option value="WASTAGE">Cutting Loss / Formwork Scrap Wastage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Quantity to Write Off *</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={damageForm.quantity}
                  onChange={(e) => setDamageForm({ ...damageForm, quantity: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Root Cause Analysis *</label>
              <textarea
                rows={2}
                required
                value={damageForm.rootCause}
                onChange={(e) => setDamageForm({ ...damageForm, rootCause: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-rose-700 px-4 py-2 text-xs font-bold text-canvas shadow-xs hover:bg-rose-800 disabled:opacity-50"
            >
              {submitting ? "Writing off..." : "Confirm Write-Off Transaction"}
            </button>
          </form>
        )}

        {/* Form 5: Stock Reconciliation */}
        {activeTab === "reconcile" && (
          <form onSubmit={handleReconcile} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Physical Audit Stock Reconciliation</h3>
              <p className="text-xs text-muted">
                Adjust book inventory to match physical warehouse tally count after audit
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Audited Warehouse *</label>
                <select
                  required
                  value={reconcileForm.warehouseId}
                  onChange={(e) => setReconcileForm({ ...reconcileForm, warehouseId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouseCode} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Material SKU *</label>
                <select
                  required
                  value={reconcileForm.materialId}
                  onChange={(e) => {
                    const mat = materials.find((m) => m.id === e.target.value);
                    setReconcileForm({
                      ...reconcileForm,
                      materialId: e.target.value,
                      actualPhysicalQuantity: mat?.totalQuantityOnHand || 0,
                    });
                  }}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.materialCode} - {m.name} (Book: {m.totalQuantityOnHand} {m.unitOfMeasurement})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Actual Physical Count Verified *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={reconcileForm.actualPhysicalQuantity}
                onChange={(e) => setReconcileForm({ ...reconcileForm, actualPhysicalQuantity: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Audit Reason & Justification *</label>
              <textarea
                rows={2}
                required
                value={reconcileForm.adjustmentReason}
                onChange={(e) => setReconcileForm({ ...reconcileForm, adjustmentReason: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-purple-700 px-4 py-2 text-xs font-bold text-canvas shadow-xs hover:bg-purple-800 disabled:opacity-50"
            >
              {submitting ? "Reconciling..." : "Commit Physical Stock Adjustment"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
