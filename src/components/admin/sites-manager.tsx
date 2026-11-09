"use client";

// ==============================================================================
// CONSTRUCT360 AUTHORIZED SITES & POSTGIS GEOFENCE CONFIGURATION MANAGER
// ==============================================================================

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Plus,
  Sliders,
  Users,
  History,
  Power,
  CheckCircle,
  AlertCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import type { SiteWithDetails } from "@/server/modules/site/site.types";
import type { DbSiteGeofenceHistory } from "@/server/db/types";

// Dynamically import Leaflet map to prevent SSR window reference
const GeofenceMap = dynamic(() => import("@/components/maps/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full animate-pulse rounded-md bg-stone/40 flex items-center justify-center text-xs text-muted">
      Loading PostGIS Geofence Spatial Canvas...
    </div>
  ),
});

export default function SitesManager() {
  const [sites, setSites] = useState<SiteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRadiusModalOpen, setIsRadiusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [selectedSite, setSelectedSite] = useState<SiteWithDetails | null>(null);
  const [geofenceHistory, setGeofenceHistory] = useState<DbSiteGeofenceHistory[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    siteCode: "",
    name: "",
    description: "",
    addressLine1: "",
    addressLine2: "",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560103",
    latitude: 12.935242,
    longitude: 77.694602,
    radiusMeters: 150,
    maxAccuracyMeters: 50,
  });

  const [newRadius, setNewRadius] = useState(150);
  const [radiusReason, setRadiusReason] = useState("");

  const [assignForm, setAssignForm] = useState({
    assigneeType: "EMPLOYEE",
    employeeId: "e0000002-0000-0000-0000-000000000002",
    labourerId: "l0000001-0000-0000-0000-000000000001",
    roleOnSite: "Site In-Charge",
    assignedFrom: new Date().toISOString().slice(0, 10),
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch sites
  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/sites?limit=50", {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSites(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/v1/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          ...formData,
          projectId: "a0000001-0000-0000-0000-000000000001", // Skyline Tech Park
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: "success", text: `Site '${formData.name}' authorized successfully with ${formData.radiusMeters}m geofence radius.` });
        setIsCreateModalOpen(false);
        fetchSites();
      } else {
        setFeedbackMsg({ type: "error", text: json.error?.message || "Failed to create site" });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    }
  };

  const handleUpdateRadius = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/v1/sites/${selectedSite.id}/radius`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          radiusMeters: Number(newRadius),
          reason: radiusReason || "Administrative perimeter recalibration",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({
          type: "success",
          text: `Geofence radius for ${selectedSite.name} updated to ${newRadius}m and logged to history audit.`,
        });
        setIsRadiusModalOpen(false);
        fetchSites();
      } else {
        setFeedbackMsg({ type: "error", text: json.error?.message || "Failed to update radius" });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    }
  };

  const handleToggleStatus = async (site: SiteWithDetails) => {
    const nextStatus = site.status === "ACTIVE_CONSTRUCTION" ? "CLOSED" : "ACTIVE_CONSTRUCTION";
    try {
      const res = await fetch(`/api/v1/sites/${site.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSites();
      }
    } catch {}
  };

  const openRadiusModal = (site: SiteWithDetails) => {
    setSelectedSite(site);
    setNewRadius(site.radiusMeters);
    setRadiusReason("");
    setIsRadiusModalOpen(true);
  };

  const openHistoryModal = async (site: SiteWithDetails) => {
    setSelectedSite(site);
    setIsHistoryModalOpen(true);
    try {
      const res = await fetch(`/api/v1/sites/${site.id}/history`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success) {
        setGeofenceHistory(json.data);
      }
    } catch {}
  };

  const openAssignModal = async (site: SiteWithDetails) => {
    setSelectedSite(site);
    setIsAssignModalOpen(true);
    try {
      const res = await fetch(`/api/v1/sites/${site.id}/assignments`, {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success) {
        setAssignments(json.data);
      }
    } catch {}
  };

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;

    try {
      const res = await fetch(`/api/v1/sites/${selectedSite.id}/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          assigneeType: assignForm.assigneeType,
          employeeId: assignForm.assigneeType === "EMPLOYEE" ? assignForm.employeeId : undefined,
          labourerId: assignForm.assigneeType === "LABOURER" ? assignForm.labourerId : undefined,
          roleOnSite: assignForm.roleOnSite,
          assignedFrom: assignForm.assignedFrom,
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Refresh assignments
        openAssignModal(selectedSite);
        fetchSites();
      }
    } catch {}
  };

  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.siteCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Authorized Construction Sites & PostGIS Geofences
          </h2>
          <p className="text-xs text-muted">
            Configure independent attendance radii, coordinates, postal addresses, and workforce assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              siteCode: `SITE-SKY-${Math.floor(100 + Math.random() * 900)}`,
              name: "",
              description: "",
              addressLine1: "",
              addressLine2: "",
              city: "Bengaluru",
              state: "Karnataka",
              postalCode: "560103",
              latitude: 12.935242,
              longitude: 77.694602,
              radiusMeters: 150,
              maxAccuracyMeters: 50,
            });
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create New Site
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 rounded p-3 text-xs ${
            feedbackMsg.type === "success"
              ? "bg-sage/40 text-olive border border-sage"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Map View of all Active Sites */}
      <div className="rounded-md border border-line bg-panel p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="font-medium text-ink flex items-center gap-2">
            <span>Enterprise Construction Sites Geofence Canvas</span>
            <span className="rounded bg-sage px-2 py-0.5 text-[10px] text-olive font-semibold">
              PostGIS 4326
            </span>
          </div>
          <span className="text-[11px] text-muted">Showing {sites.length} authorized site perimeters</span>
        </div>
        <GeofenceMap
          sites={sites.map((s) => ({
            id: s.id,
            name: s.name,
            siteCode: s.siteCode,
            latitude: s.latitude,
            longitude: s.longitude,
            radiusMeters: s.radiusMeters,
            status: s.status,
          }))}
          centerLat={sites[0]?.latitude || 12.935242}
          centerLon={sites[0]?.longitude || 77.694602}
          zoom={15}
          className="h-[360px] w-full rounded border border-line"
        />
      </div>

      {/* Search & Site Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sites by name, code, or city..."
              className="w-full rounded border border-line bg-panel pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-line bg-panel shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-canvas text-muted uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Site Code & Name</th>
                <th className="py-2.5 px-3">Postal Address</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Configured Radius</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Workers</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filteredSites.map((site) => (
                <tr key={site.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-ink">{site.name}</div>
                    <div className="font-mono text-[10px] text-accent">{site.siteCode}</div>
                  </td>
                  <td className="py-3 px-3 text-muted">
                    <div>{site.addressLine1}</div>
                    <div className="text-[11px]">{site.city}, {site.state} - {site.postalCode}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-muted">
                    {site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 rounded bg-stone/50 px-2 py-0.5 font-mono text-xs font-semibold text-graphite border border-line">
                      {site.radiusMeters}m
                    </span>
                    <span className="block text-[10px] text-muted mt-0.5">
                      Max Acc: {site.maxAccuracyMeters}m
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                        site.status === "ACTIVE_CONSTRUCTION"
                          ? "bg-sage/50 text-olive"
                          : "bg-stone text-muted"
                      }`}
                    >
                      {site.status === "ACTIVE_CONSTRUCTION" ? "ACTIVE" : site.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium">
                    <button
                      onClick={() => openAssignModal(site)}
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <Users className="h-3 w-3" />
                      {site.assignmentsCount} Assigned
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openRadiusModal(site)}
                        title="Adjust Geofence Radius"
                        className="rounded border border-line bg-canvas p-1 text-muted hover:text-ink hover:border-accent"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openHistoryModal(site)}
                        title="View Geofence Configuration History"
                        className="rounded border border-line bg-canvas p-1 text-muted hover:text-ink hover:border-accent"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(site)}
                        title={site.status === "ACTIVE_CONSTRUCTION" ? "Deactivate Site" : "Activate Site"}
                        className={`rounded border border-line bg-canvas p-1 ${
                          site.status === "ACTIVE_CONSTRUCTION"
                            ? "text-olive hover:text-red-700"
                            : "text-red-600 hover:text-olive"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSites.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No authorized construction sites match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SITE MODAL WITH MAP-BASED PIN ADJUSTMENT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-panel p-6 shadow-xl border border-line">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Authorize New Construction Site & Geofence
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted hover:text-ink text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Site Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.siteCode}
                    onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Tower B Phase 2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Complete Postal Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    placeholder="Street / Plot / Survey No."
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Address Line 2</label>
                  <input
                    type="text"
                    placeholder="Landmark / Area"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Interactive Map Picker */}
              <div className="space-y-1 pt-2">
                <label className="block text-muted font-medium">
                  Search & Pin Location on Interactive Map (Click or Drag Marker)
                </label>
                <GeofenceMap
                  isEditable={true}
                  centerLat={formData.latitude}
                  centerLon={formData.longitude}
                  radiusMeters={formData.radiusMeters}
                  onPositionChange={(lat, lon) => {
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lon }));
                  }}
                  onRadiusChange={(r) => {
                    setFormData((prev) => ({ ...prev, radiusMeters: r }));
                  }}
                  className="h-[280px] w-full rounded border border-line"
                />
              </div>

              {/* Radius & Max Accuracy Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-muted font-medium mb-1">
                    Attendance Radius (Meters) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    required
                    value={formData.radiusMeters}
                    onChange={(e) => setFormData({ ...formData, radiusMeters: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <span className="text-[10px] text-muted">Radius stored strictly in database. Never hardcoded.</span>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">
                    Max Permitted GPS Accuracy (Meters) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    required
                    value={formData.maxAccuracyMeters}
                    onChange={(e) => setFormData({ ...formData, maxAccuracyMeters: Number(e.target.value) })}
                    className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <span className="text-[10px] text-muted">Rejects signals with uncertainty exceeding this ceiling.</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  Save & Activate Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST RADIUS MODAL ("Change the radius later") */}
      {isRadiusModalOpen && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-panel p-5 shadow-xl border border-line text-xs">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="font-semibold text-ink flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent" />
                Recalibrate Geofence Radius
              </h3>
              <button
                onClick={() => setIsRadiusModalOpen(false)}
                className="text-muted hover:text-ink font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-muted mb-4">
              Updating radius for <strong>{selectedSite.name}</strong>. Previous configured radius was{" "}
              <strong>{selectedSite.radiusMeters}m</strong>.
            </p>

            <form onSubmit={handleUpdateRadius} className="space-y-4">
              <div>
                <label className="block text-muted font-medium mb-1">New Radius (Meters) *</label>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  required
                  value={newRadius}
                  onChange={(e) => setNewRadius(Number(e.target.value))}
                  className="w-full rounded border border-line bg-canvas px-3 py-1.5 text-xs text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">
                  Reason for Radius Adjustment (Audit Trail) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Incorporated western laydown yard; expanded crane swing zone perimeter."
                  value={radiusReason}
                  onChange={(e) => setRadiusReason(e.target.value)}
                  className="w-full rounded border border-line bg-canvas p-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsRadiusModalOpen(false)}
                  className="rounded border border-line bg-canvas px-3 py-1.5 text-xs text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-ink px-4 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  Save & Log History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GEOFENCE CONFIGURATION HISTORY MODAL */}
      {isHistoryModalOpen && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-panel p-5 shadow-xl border border-line text-xs">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="font-semibold text-ink flex items-center gap-2">
                <History className="h-4 w-4 text-accent" />
                Geofence Configuration History - {selectedSite.name}
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-muted hover:text-ink font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {geofenceHistory.map((h, i) => (
                <div key={h.id || i} className="rounded border border-line bg-canvas p-3">
                  <div className="flex items-center justify-between text-muted text-[11px] mb-1">
                    <span className="font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                    <span className="rounded bg-sage px-1.5 py-0.5 text-[10px] text-olive font-medium">
                      Revision #{geofenceHistory.length - i}
                    </span>
                  </div>
                  <div className="text-ink font-medium">
                    Radius: <span className="line-through text-muted">{h.oldRadiusMeters}m</span> →{" "}
                    <span className="text-accent font-semibold">{h.newRadiusMeters}m</span>
                  </div>
                  <div className="text-muted mt-1 italic">&ldquo;{h.reason}&rdquo;</div>
                </div>
              ))}

              {geofenceHistory.length === 0 && (
                <div className="py-6 text-center text-muted">No prior adjustments logged.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WORKFORCE ASSIGNMENTS MODAL */}
      {isAssignModalOpen && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-panel p-5 shadow-xl border border-line text-xs">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="font-semibold text-ink flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                Site Personnel Assignments - {selectedSite.name}
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-muted hover:text-ink font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Existing Assignments Table */}
            <div className="mb-4">
              <h4 className="font-medium text-ink mb-2">Currently Assigned Personnel</h4>
              <div className="rounded border border-line bg-canvas overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-stone/30 text-muted text-[10px] uppercase font-semibold">
                    <tr>
                      <th className="p-2">Worker</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Role on Site</th>
                      <th className="p-2">Assigned From</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-ink">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="p-2 font-medium">
                          {a.workerName}{" "}
                          <span className="font-mono text-[10px] text-muted">({a.workerCode})</span>
                        </td>
                        <td className="p-2 text-muted">{a.assigneeType}</td>
                        <td className="p-2">{a.roleOnSite || "General Staff"}</td>
                        <td className="p-2 font-mono text-muted">{new Date(a.assignedFrom).toLocaleDateString()}</td>
                        <td className="p-2">
                          <span className="rounded bg-sage px-1.5 py-0.5 text-[10px] text-olive font-semibold">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted">
                          No workers assigned to this site yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Assign Worker Form */}
            <form onSubmit={handleAssignWorker} className="rounded border border-line bg-canvas p-3 space-y-3">
              <h4 className="font-medium text-ink">Assign Additional Worker</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Assignee Type</label>
                  <select
                    value={assignForm.assigneeType}
                    onChange={(e) => setAssignForm({ ...assignForm, assigneeType: e.target.value })}
                    className="w-full rounded border border-line bg-panel p-1.5 text-xs text-ink focus:outline-none"
                  >
                    <option value="EMPLOYEE">Staff Employee</option>
                    <option value="LABOURER">Site Labourer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Select Person</label>
                  {assignForm.assigneeType === "EMPLOYEE" ? (
                    <select
                      value={assignForm.employeeId}
                      onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                      className="w-full rounded border border-line bg-panel p-1.5 text-xs text-ink focus:outline-none"
                    >
                      <option value="e0000002-0000-0000-0000-000000000002">Vikram Singh (Site Engineer)</option>
                      <option value="e0000003-0000-0000-0000-000000000003">Suresh Kumar (Project Manager)</option>
                      <option value="e0000001-0000-0000-0000-000000000001">Rajesh Menon (VP Operations)</option>
                    </select>
                  ) : (
                    <select
                      value={assignForm.labourerId}
                      onChange={(e) => setAssignForm({ ...assignForm, labourerId: e.target.value })}
                      className="w-full rounded border border-line bg-panel p-1.5 text-xs text-ink focus:outline-none"
                    >
                      <option value="l0000001-0000-0000-0000-000000000001">Ramesh Chand (Mason)</option>
                      <option value="l0000002-0000-0000-0000-000000000002">Mohammed Ansari (Bar Bender)</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Role On Site</label>
                  <input
                    type="text"
                    value={assignForm.roleOnSite}
                    onChange={(e) => setAssignForm({ ...assignForm, roleOnSite: e.target.value })}
                    className="w-full rounded border border-line bg-panel p-1.5 text-xs text-ink"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Assigned From Date</label>
                  <input
                    type="date"
                    value={assignForm.assignedFrom}
                    onChange={(e) => setAssignForm({ ...assignForm, assignedFrom: e.target.value })}
                    className="w-full rounded border border-line bg-panel p-1.5 text-xs text-ink"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded bg-ink px-3 py-1.5 text-xs font-medium text-canvas hover:opacity-90"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
