"use client";

// ==============================================================================
// CONSTRUCT360 MATERIAL MASTER CATALOGUE & STOCK DOSSIER
// Enterprise Materials, Technical Specifications, Minimum Stock & Pricing
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Building,
  Tag,
  QrCode,
  Barcode,
  History,
  X,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Package,
} from "lucide-react";
import type { MaterialWithStock } from "@/server/modules/inventory/inventory.types";

export default function MaterialMaster() {
  const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: "",
    category: "CEMENT" as const,
    unitOfMeasurement: "BAGS" as const,
    brand: "",
    specification: "",
    standardRate: 380,
    preferredSupplier: "",
    minimumStock: 100,
    maximumStock: 2000,
    reorderLevel: 300,
    hsnCode: "",
    gstPercent: 18,
    barcode: "",
  });

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      let url = "/api/v1/inventory/materials?limit=100";
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter !== "ALL") url += `&category=${categoryFilter}`;
      if (lowStockFilter) url += `&lowStock=true`;

      const res = await fetch(url, { headers: { "x-construct-csrf": "1" } });
      const json = await res.json();
      if (json.success && json.data) {
        setMaterials(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [search, categoryFilter, lowStockFilter]);

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/inventory/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-construct-csrf": "1" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unitOfMeasurement: form.unitOfMeasurement,
          brand: form.brand.trim() || undefined,
          specification: form.specification.trim() || undefined,
          standardRate: Number(form.standardRate),
          preferredSupplier: form.preferredSupplier.trim() || undefined,
          minimumStock: Number(form.minimumStock),
          maximumStock: Number(form.maximumStock),
          reorderLevel: Number(form.reorderLevel) || undefined,
          hsnCode: form.hsnCode.trim() || undefined,
          gstPercent: Number(form.gstPercent),
          barcode: form.barcode.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setForm({
          name: "",
          category: "CEMENT",
          unitOfMeasurement: "BAGS",
          brand: "",
          specification: "",
          standardRate: 380,
          preferredSupplier: "",
          minimumStock: 100,
          maximumStock: 2000,
          reorderLevel: 300,
          hsnCode: "",
          gstPercent: 18,
          barcode: "",
        });
        await fetchMaterials();
      } else {
        alert(json.error?.message || "Failed to create material");
      }
    } catch (err: any) {
      alert(err?.message || "Error creating material master");
    } finally {
      setSubmitting(false);
    }
  };

  const openDossier = async (materialId: string) => {
    setDossierLoading(true);
    try {
      const res = await fetch(`/api/v1/inventory/materials/${materialId}`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success) {
        setSelectedMaterial(json.data);
      }
    } catch {
    } finally {
      setDossierLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Boxes className="h-4 w-4 text-accent" />
            Material Master Directory & Specifications
          </h2>
          <p className="text-xs text-muted">
            Authoritative registry of construction materials, units of measure, standard rates & minimum stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMaterials()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Catalog
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Material Master
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search by material code, name, brand, spec..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-panel pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="CEMENT">Cement</option>
            <option value="STEEL_REBAR">Steel & Rebar</option>
            <option value="AGGREGATES_SAND">Aggregates & Sand</option>
            <option value="BRICKS_BLOCKS">Bricks & Blocks</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING_PIPES">Plumbing & Pipes</option>
            <option value="FINISHING_PAINT">Finishing & Paint</option>
            <option value="TIMBER_FORMWORK">Timber & Formwork</option>
            <option value="CHEMICALS_ADMIXTURES">Chemicals & Admixtures</option>
            <option value="SAFETY_PPE">Safety & PPE</option>
          </select>

          <label className="flex items-center gap-1.5 border border-line bg-panel px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="rounded border-line"
            />
            <span className="flex items-center gap-1 text-amber-800 font-semibold">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              Low Stock Only
            </span>
          </label>
        </div>
      </div>

      {/* Materials Table */}
      <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas border-b border-line text-[10px] font-bold text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Code & Material Name</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">UOM</th>
              <th className="px-3 py-3 text-right">Standard Rate</th>
              <th className="px-3 py-3 text-right">On-Hand Stock</th>
              <th className="px-3 py-3 text-right">Min / Max</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {materials.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No materials match the current filters.
                </td>
              </tr>
            ) : (
              materials.map((m) => (
                <tr key={m.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1.5 py-0.5 rounded">
                        {m.materialCode}
                      </span>
                      {m.isLowStock && (
                        <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-800">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-ink mt-0.5">{m.name}</div>
                    {m.brand && (
                      <div className="text-[11px] text-muted">
                        Brand: {m.brand} {m.specification ? `• ${m.specification}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                      {m.category}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-ink">{m.unitOfMeasurement}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-ink">
                    ₹{m.standardRate.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={`font-mono text-xs font-bold ${
                        m.isLowStock ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {m.totalQuantityOnHand.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-muted">
                      Avail: {m.totalAvailableQuantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-[11px] text-muted">
                    {m.minimumStock.toLocaleString()} / {m.maximumStock.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDossier(m.id)}
                      className="rounded-md border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink shadow-2xs hover:bg-ink hover:text-canvas transition-colors"
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Material Master */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-lg border border-line bg-panel p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Boxes className="h-4 w-4 text-accent" />
                Register New Material Master
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Super PPC Cement 53 Grade"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="CEMENT">Cement</option>
                    <option value="STEEL_REBAR">Steel & Rebar</option>
                    <option value="AGGREGATES_SAND">Aggregates & Sand</option>
                    <option value="BRICKS_BLOCKS">Bricks & Blocks</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="PLUMBING_PIPES">Plumbing & Pipes</option>
                    <option value="FINISHING_PAINT">Finishing & Paint</option>
                    <option value="TIMBER_FORMWORK">Timber & Formwork</option>
                    <option value="CHEMICALS_ADMIXTURES">Chemicals & Admixtures</option>
                    <option value="SAFETY_PPE">Safety & PPE</option>
                    <option value="OTHER">Other Technical SKU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Unit of Measurement *</label>
                  <select
                    value={form.unitOfMeasurement}
                    onChange={(e) => setForm({ ...form, unitOfMeasurement: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  >
                    <option value="BAGS">Bags</option>
                    <option value="MT">Metric Tonnes (MT)</option>
                    <option value="KG">Kilograms (KG)</option>
                    <option value="CUM">Cubic Metres (CUM)</option>
                    <option value="CFT">Cubic Feet (CFT)</option>
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="LTR">Litres (LTR)</option>
                    <option value="MTR">Metres (MTR)</option>
                    <option value="SQFT">Square Feet (SQFT)</option>
                    <option value="SQM">Square Metres (SQM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Manufacturer / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata Tiscon"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Standard Unit Rate (INR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.standardRate}
                    onChange={(e) => setForm({ ...form, standardRate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Technical Specification</label>
                <input
                  type="text"
                  placeholder="e.g. IS 1489 Part 1 Flyash based 53 Grade equivalent"
                  value={form.specification}
                  onChange={(e) => setForm({ ...form, specification: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Min Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.minimumStock}
                    onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Max Stock *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.maximumStock}
                    onChange={(e) => setForm({ ...form, maximumStock: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">HSN Code</label>
                  <input
                    type="text"
                    placeholder="252329"
                    value={form.hsnCode}
                    onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">GST %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.gstPercent}
                    onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-line bg-canvas px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Preferred Supplier</label>
                  <input
                    type="text"
                    placeholder="UltraTech Ltd"
                    value={form.preferredSupplier}
                    onChange={(e) => setForm({ ...form, preferredSupplier: e.target.value })}
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
                  className="rounded-md bg-ink px-4 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Material SKU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Material Dossier */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-lg border border-line bg-panel p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent bg-stone/40 px-2 py-0.5 rounded">
                    {selectedMaterial.materialCode}
                  </span>
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-800">
                    {selectedMaterial.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink mt-1">{selectedMaterial.name}</h3>
              </div>
              <button onClick={() => setSelectedMaterial(null)} className="text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Technical Spec & Pricing Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-canvas p-3 rounded border border-line">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">UOM</span>
                  <span className="font-bold text-ink">{selectedMaterial.unitOfMeasurement}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Standard Rate</span>
                  <span className="font-bold text-ink">₹{selectedMaterial.standardRate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Total Stock</span>
                  <span className="font-bold text-emerald-700">
                    {selectedMaterial.totalQuantityOnHand} {selectedMaterial.unitOfMeasurement}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Total Valuation</span>
                  <span className="font-bold text-ink">
                    {formatCurrency(selectedMaterial.totalInventoryValue)}
                  </span>
                </div>
              </div>

              {/* Warehouse Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Warehouse Stock Balances
                </h4>
                <div className="space-y-1.5">
                  {selectedMaterial.warehousesDistribution.map((w: any) => (
                    <div
                      key={w.warehouseId}
                      className="flex items-center justify-between bg-canvas p-2.5 rounded border border-line"
                    >
                      <div>
                        <span className="font-bold text-ink">{w.warehouseName}</span>
                        <span className="font-mono text-[10px] text-muted ml-2">({w.warehouseCode})</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-ink">
                        {w.quantity} {selectedMaterial.unitOfMeasurement}{" "}
                        <span className="text-[10px] font-normal text-muted">
                          (Avail: {w.availableQuantity})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplier Price Revision History */}
              {selectedMaterial.priceHistory?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                    Supplier Price Revision History
                  </h4>
                  <div className="space-y-1">
                    {selectedMaterial.priceHistory.map((ph: any) => (
                      <div
                        key={ph.id}
                        className="flex items-center justify-between bg-canvas px-3 py-1.5 rounded border border-line text-[11px]"
                      >
                        <div>
                          <span className="font-semibold text-ink">{ph.supplierName}</span>
                          <span className="text-muted ml-2">
                            {new Date(ph.effectiveDate).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-ink">₹{ph.unitRate} / unit</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
