"use client";

// ==============================================================================
// CONSTRUCT360 INVENTORY & WAREHOUSE EXECUTIVE COMMAND DASHBOARD
// Total Valuation, Category Distribution, Low Stock Alerts & Live Movements
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  Boxes,
  IndianRupee,
  Warehouse,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Plus,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { InventoryDashboardData } from "@/server/modules/inventory/inventory.types";

export default function InventoryDashboard({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [data, setData] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/inventory/dashboard", {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load inventory metrics");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading inventory analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs font-medium text-muted">Calculating enterprise inventory valuation & balances...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50/50 p-6 text-sm text-red-800">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Error Loading Inventory Dashboard
        </div>
        <p className="mt-1 text-xs text-red-700">{error || "No data returned"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Boxes className="h-5 w-5 text-accent" />
            Inventory & Warehouse Command Center
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time multi-warehouse stock balances, atomic immutable ledger, indent fulfillment & valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboard()}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-stone/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("operations")}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-canvas shadow-xs hover:bg-ink/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Stock Operations
            </button>
          )}
        </div>
      </div>

      {/* Critical Low-Stock Alert Banner if any */}
      {data.lowStockItemsCount > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              Stock Reorder Alert: {data.lowStockItemsCount} Material(s) Below Minimum Threshold
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("materials")}
                className="font-bold text-accent hover:underline flex items-center gap-1"
              >
                View Items <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.lowStockAlerts.slice(0, 4).map((m) => (
              <span
                key={m.materialId}
                className="rounded bg-amber-200/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-900"
              >
                {m.name}: {m.currentStock} / {m.minimumStock} {m.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Total Stock Value</span>
          <span className="text-lg font-bold text-ink mt-1 block">
            {formatCurrency(data.totalStockValueINR)}
          </span>
          <span className="text-[10px] text-muted block mt-1">Weighted average valuation</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Material Master SKUs</span>
          <span className="text-lg font-bold text-ink mt-1 block">
            {data.totalMaterialsCount} Items
          </span>
          <span className="text-[10px] text-muted block mt-1">Across 10 categories</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Low-Stock Items</span>
          <span
            className={`text-lg font-bold mt-1 block ${
              data.lowStockItemsCount > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {data.lowStockItemsCount} SKUs
          </span>
          <span className="text-[10px] text-muted block mt-1">Below minimum threshold</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Active Warehouses</span>
          <span className="text-lg font-bold text-ink mt-1 block">
            {data.activeWarehousesCount} Hubs
          </span>
          <span className="text-[10px] text-muted block mt-1">Central & Project stores</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Pending Material Requests</span>
          <span className="text-lg font-bold text-ink mt-1 block">
            {data.pendingRequestsCount} Indents
          </span>
          <span className="text-[10px] text-muted block mt-1">Awaiting PM or Store</span>
        </div>

        <div className="rounded-lg border border-line bg-panel p-4 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-muted block">Transfers in Transit</span>
          <span className="text-lg font-bold text-ink mt-1 block">
            {data.inTransitTransfersCount} Orders
          </span>
          <span className="text-[10px] text-muted block mt-1">Dispatched inter-site</span>
        </div>
      </div>

      {/* Middle Row: Warehouse Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Warehouse Storage Hubs */}
        <div className="rounded-lg border border-line bg-panel p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-accent" />
              Warehouse Storage Facilities ({data.warehouseQuantities.length})
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("warehouses")}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Manage Warehouses &rarr;
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {data.warehouseQuantities.map((w) => (
              <div
                key={w.warehouseId}
                className="rounded-md border border-line bg-canvas p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent bg-stone/40 px-1.5 py-0.5 rounded">
                      {w.warehouseCode}
                    </span>
                    <span className="font-bold text-ink">{w.warehouseName}</span>
                  </div>
                  <span className="text-[11px] text-muted mt-0.5 block">
                    {w.totalItems} distinct material items stocked
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-ink block">
                    {formatCurrency(w.totalValuationINR)}
                  </span>
                  <span className="text-[10px] text-muted">Stock Valuation</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Valuation Breakdown */}
        <div className="rounded-lg border border-line bg-panel p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-accent" />
              Category Valuation Distribution
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("valuation")}
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Full Valuation Report &rarr;
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {data.categoryDistribution.slice(0, 5).map((cat) => {
              const pct = data.totalStockValueINR > 0
                ? Math.round((cat.valueINR / data.totalStockValueINR) * 100)
                : 0;
              return (
                <div key={cat.category} className="text-xs">
                  <div className="flex items-center justify-between text-[11px] font-medium text-ink mb-1">
                    <span>{cat.category} ({cat.count} SKUs)</span>
                    <span className="font-mono font-bold">{formatCurrency(cat.valueINR)} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Transaction Ledger Ticker */}
      <div className="rounded-lg border border-line bg-panel shadow-xs overflow-hidden">
        <div className="bg-canvas px-4 py-3 border-b border-line flex items-center justify-between text-xs font-bold text-ink">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-accent" />
            Recent Stock Movements & Immutable Ledger Entries
          </span>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("ledger")}
              className="text-[11px] font-bold text-accent hover:underline"
            >
              View Full Audit Ledger &rarr;
            </button>
          )}
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-canvas/50 border-b border-line text-[10px] font-bold text-muted uppercase">
            <tr>
              <th className="px-4 py-2.5">Date & Time</th>
              <th className="px-3 py-2.5">Transaction Type</th>
              <th className="px-3 py-2.5 text-right">Quantity</th>
              <th className="px-3 py-2.5 text-right">Value (INR)</th>
              <th className="px-3 py-2.5">Reference #</th>
              <th className="px-4 py-2.5">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {data.recentMovements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No stock transactions logged yet.
                </td>
              </tr>
            ) : (
              data.recentMovements.map((tx) => (
                <tr key={tx.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-ink">
                    {new Date(tx.timestamp).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-ink">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                        tx.transactionType.includes("RECEIPT") || tx.transactionType.includes("RETURN") || tx.transactionType.includes("OPENING") || tx.transactionType.includes("IN")
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {tx.transactionType.includes("RECEIPT") || tx.transactionType.includes("RETURN") || tx.transactionType.includes("OPENING") || tx.transactionType.includes("IN") ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold text-ink">
                    {tx.quantity} {tx.unit}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted">
                    {formatCurrency(tx.totalValue)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-accent">
                    {tx.referenceNumber}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-[11px] truncate max-w-xs">
                    {tx.remarks || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
