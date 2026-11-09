"use client";

// ==============================================================================
// CONSTRUCT360 WORKFORCE EXECUTIVE DASHBOARD
// High-Level KPIs, Site Allocation, Trade Distribution & Pending Actions
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  Users,
  HardHat,
  Briefcase,
  UserCheck,
  UserX,
  FileCheck2,
  Coins,
  Receipt,
  Building,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  Hammer,
} from "lucide-react";

interface DashboardData {
  totalEmployees: number;
  permanentEmployees: number;
  temporaryEmployees: number;
  totalLabourers: number;
  activeContractors: number;
  siteWiseWorkforce: Array<{
    siteId: string;
    siteName: string;
    siteCode: string;
    employeesCount: number;
    labourersCount: number;
    totalWorkers: number;
  }>;
  tradeDistribution: Array<{ trade: string; count: number }>;
  skillDistribution: Array<{ skill: string; count: number }>;
  todayWorkersPresent: number;
  todayWorkersAbsent: number;
  availableWorkforce: number;
  pendingDocumentVerifications: number;
  pendingAdvanceRequests: number;
  pendingContractorBills: number;
}

export default function WorkforceDashboard({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/workforce/dashboard", {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load dashboard metrics");
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading workforce dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-panel p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs font-medium text-muted">Aggregating enterprise workforce metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50/50 p-6 text-sm text-red-800">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          Error Loading Workforce Analytics
        </div>
        <p className="mt-1 text-xs text-red-700">{error || "No data returned"}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium hover:bg-red-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Workforce Command & Analytics
          </h2>
          <p className="text-xs text-muted">
            Real-time human capital, daily muster roll, subcontractor commitments, and wage ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Workforce */}
        <div className="rounded-lg border border-line bg-panel p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Total Headcount</span>
            <span className="rounded-full bg-accent/15 p-2 text-accent">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {data.totalEmployees + data.totalLabourers}
            </span>
            <span className="text-xs text-muted">active workers</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted border-t border-line/60 pt-2">
            <span>Staff: <strong className="text-ink">{data.totalEmployees}</strong></span>
            <span>&bull;</span>
            <span>Labour: <strong className="text-ink">{data.totalLabourers}</strong></span>
          </div>
        </div>

        {/* Daily Muster / Present Today */}
        <div className="rounded-lg border border-line bg-panel p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Today's Muster</span>
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-800">
              {data.todayWorkersPresent}
            </span>
            <span className="text-xs text-emerald-700 font-medium">on site now</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted border-t border-line/60 pt-2">
            <span className="text-amber-700 flex items-center gap-1">
              <UserX className="h-3 w-3" />
              Absent: <strong>{data.todayWorkersAbsent}</strong>
            </span>
            <span>&bull;</span>
            <span>Available: <strong>{data.availableWorkforce}</strong></span>
          </div>
        </div>

        {/* Active Contractors */}
        <div className="rounded-lg border border-line bg-panel p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Subcontractors</span>
            <span className="rounded-full bg-blue-100 p-2 text-blue-700">
              <Briefcase className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {data.activeContractors}
            </span>
            <span className="text-xs text-muted">contractors active</span>
          </div>
          <div className="mt-2 text-[11px] text-muted border-t border-line/60 pt-2 truncate">
            Trade agencies deployed
          </div>
        </div>

        {/* Action Items / Approvals Pending */}
        <div className="rounded-lg border border-line bg-panel p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Pending Approvals</span>
            <span className="rounded-full bg-amber-100 p-2 text-amber-700">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-900">
              {data.pendingDocumentVerifications + data.pendingAdvanceRequests + data.pendingContractorBills}
            </span>
            <span className="text-xs text-amber-700">items await review</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted border-t border-line/60 pt-2 truncate">
            <span>Docs: <strong>{data.pendingDocumentVerifications}</strong></span>
            <span>&bull;</span>
            <span>Advances: <strong>{data.pendingAdvanceRequests}</strong></span>
            <span>&bull;</span>
            <span>Bills: <strong>{data.pendingContractorBills}</strong></span>
          </div>
        </div>
      </div>

      {/* Site-Wise Workforce Allocation & Labour Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Site Allocation Table */}
        <div className="lg:col-span-2 rounded-lg border border-line bg-panel p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">Site-Wise Workforce Deployment</h3>
            </div>
            <span className="text-xs text-muted">
              {data.siteWiseWorkforce?.length || 0} active construction sites
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted uppercase text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Site Name</th>
                  <th className="py-2.5 px-3 text-center">Engineers & Staff</th>
                  <th className="py-2.5 px-3 text-center">Daily Labourers</th>
                  <th className="py-2.5 px-3 text-right">Total Force</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {data.siteWiseWorkforce?.map((site) => (
                  <tr key={site.siteId} className="hover:bg-canvas/50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-ink flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      {site.siteName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-muted font-mono">
                      {site.employeesCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-muted font-mono">
                      {site.labourersCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-ink font-mono">
                      {site.totalWorkers}
                    </td>
                  </tr>
                ))}
                {(!data.siteWiseWorkforce || data.siteWiseWorkforce.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted">
                      No sites currently have assigned workforce.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skill Category & Trade Distribution */}
        <div className="space-y-6">
          {/* Skill Breakdown */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-ink">Skill Categories</h3>
              </div>
              <span className="text-[11px] text-muted">Muster classification</span>
            </div>
            <div className="space-y-2">
              {data.skillDistribution?.map((item) => (
                <div key={item.skill} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted font-medium">
                    {item.skill.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-stone/30 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{
                          width: `${Math.min(100, (item.count / (data.totalLabourers || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono font-semibold text-ink w-6 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade Classification Badges */}
          <div className="rounded-lg border border-line bg-panel p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-ink">Primary Trades</h3>
              </div>
              <span className="text-[11px] text-muted">Trade distribution</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.tradeDistribution?.map((item) => (
                <span
                  key={item.trade}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1 text-[11px] text-ink"
                >
                  <span className="font-medium">{item.trade.replace(/_/g, " ")}:</span>
                  <span className="font-mono font-bold text-accent">{item.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="rounded-lg border border-line bg-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <TrendingUp className="h-4 w-4 text-accent" />
          Quick Management Actions:
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab("employees")}
                className="flex items-center gap-1 rounded border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-accent" />
                Manage Staff
              </button>
              <button
                onClick={() => onNavigateTab("labourers")}
                className="flex items-center gap-1 rounded border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
              >
                <HardHat className="h-3.5 w-3.5 text-accent" />
                Labour & Gangs
              </button>
              <button
                onClick={() => onNavigateTab("contractors")}
                className="flex items-center gap-1 rounded border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/20 transition-colors"
              >
                <Briefcase className="h-3.5 w-3.5 text-accent" />
                Contractors & Bills
              </button>
              <button
                onClick={() => onNavigateTab("portal")}
                className="flex items-center gap-1 rounded bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:bg-ink/90 transition-colors"
              >
                Self-Service Portal
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
