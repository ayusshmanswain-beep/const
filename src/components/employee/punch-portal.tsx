"use client";

// ==============================================================================
// CONSTRUCT360 MOBILE FIELD ATTENDANCE PUNCH PORTAL
// Geolocation API Verification, Privacy-First On-Demand GPS & Verification Display
// ==============================================================================

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Navigation,
  Compass,
  Building,
  RotateCcw,
} from "lucide-react";
import type { AttendancePunchResult, AttendanceStatusResponse } from "@/server/modules/attendance/attendance.types";

interface GeoPreset {
  label: string;
  lat: number;
  lon: number;
  accuracy: number;
  description: string;
}

export default function EmployeePunchPortal() {
  const [statusData, setStatusData] = useState<AttendanceStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<"granted" | "prompt" | "denied" | "unsupported">("prompt");

  // Punch Execution State
  const [isLocating, setIsLocating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [punchResult, setPunchResult] = useState<AttendancePunchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ title: string; detail: string } | null>(null);

  // Field Testing Coordinates Selector
  const [selectedPreset, setSelectedPreset] = useState<string>("REAL_GPS");

  const presets: Record<string, GeoPreset> = {
    INSIDE_TOWER_A: {
      label: "Inside Tower A (34m from center - High Accuracy 8.5m)",
      lat: 12.935400,
      lon: 77.694800,
      accuracy: 8.5,
      description: "Well within 150m geofence perimeter. Spatial check should pass with VERIFIED status.",
    },
    EXACT_BOUNDARY: {
      label: "Exact Boundary Edge (150.0m - Accuracy 12m)",
      lat: 12.935242,
      lon: 77.695992,
      accuracy: 12.0,
      description: "Right on the 150m boundary parallel. Tests sub-meter epsilon tolerance.",
    },
    OUTSIDE_GEOFENCE: {
      label: "Outside Geofence (450m away in Bellandur - Accuracy 10m)",
      lat: 12.938500,
      lon: 77.697500,
      accuracy: 10.0,
      description: "Outside configured 150m perimeter. Routes to supervisor exception approval.",
    },
    POOR_ACCURACY: {
      label: "Poor Accuracy Simulation (120m accuracy - Exceeds 50m ceiling)",
      lat: 12.935242,
      lon: 77.694602,
      accuracy: 120.0,
      description: "Simulates indoor heavy concrete signal attenuation. Server blocks poor accuracy.",
    },
  };

  // Check initial browser Geolocation permission status
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermissionState("unsupported");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as any })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => setPermissionState(result.state);
        })
        .catch(() => {
          setPermissionState("prompt");
        });
    }
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/attendance/status", {
        headers: { "x-construct-csrf": "1" },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStatusData(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Primary Action: Execute Location Request only when explicitly clicking Check-in or Check-out
  const handleInitiatePunch = async (punchType: "CLOCK_IN" | "CLOCK_OUT") => {
    setErrorMessage(null);
    setPunchResult(null);

    const activeSite = statusData?.assignedSites[0];
    if (!activeSite) {
      setErrorMessage({
        title: "Employee Not Assigned",
        detail: "You are not currently assigned to an active construction site. Contact your project manager.",
      });
      return;
    }

    // Step A: Determine Coordinates (Real Browser Geolocation or Selected Testing Preset)
    if (selectedPreset !== "REAL_GPS") {
      const preset = presets[selectedPreset];
      await submitCoordinatesToBackend(punchType, activeSite.id, preset.lat, preset.lon, preset.accuracy);
      return;
    }

    // Real Browser Geolocation API acquisition
    if (!navigator.geolocation) {
      setErrorMessage({
        title: "GPS Unavailable",
        detail: "Geolocation API is not supported by your browser or device.",
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setPermissionState("granted");
        await submitCoordinatesToBackend(
          punchType,
          activeSite.id,
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          setErrorMessage({
            title: "Location Permission Denied",
            detail: "Browser blocked GPS access. Please click the site settings lock icon in your address bar and allow location permission to record attendance.",
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorMessage({
            title: "GPS Signal Unavailable",
            detail: "Unable to acquire satellite fix. Ensure device location / GPS is turned ON and step away from metal roofing.",
          });
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage({
            title: "GPS Timeout",
            detail: "Location request timed out after 10 seconds. Please try again.",
          });
        } else {
          setErrorMessage({
            title: "Location Acquisition Failed",
            detail: err.message,
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const submitCoordinatesToBackend = async (
    punchType: "CLOCK_IN" | "CLOCK_OUT",
    siteId: string,
    lat: number,
    lon: number,
    accuracy: number
  ) => {
    setIsVerifying(true);
    const endpoint = punchType === "CLOCK_IN" ? "/api/v1/attendance/check-in" : "/api/v1/attendance/check-out";

    // Generate unique idempotency key to prevent replay attacks and double punches
    const idempotencyKey = `punch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-construct-csrf": "1",
        },
        body: JSON.stringify({
          siteId,
          latitude: lat,
          longitude: lon,
          gpsAccuracyMeters: accuracy,
          idempotencyKey,
          deviceId: navigator.userAgent.slice(0, 50),
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPunchResult(json.data);
        fetchStatus();
      } else {
        setErrorMessage({
          title: "Attendance Verification Failed",
          detail: json.error?.message || "Spatial check rejected your punch attempt.",
        });
      }
    } catch (err: any) {
      setErrorMessage({
        title: "Network Failure",
        detail: "Failed to connect to backend verification services. Check your data connection.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const activeSite = statusData?.assignedSites[0];
  const isCheckedIn = statusData?.isCheckedIn;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Worker Greeting & Live Status */}
      <div className="rounded-lg border border-line bg-panel p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              CONSTRUCT360 Field Attendance Portal
            </div>
            <h2 className="text-xl font-bold text-ink mt-0.5">
              {statusData?.employee
                ? `${statusData.employee.firstName} ${statusData.employee.lastName}`
                : "Authenticated Site Staff"}
            </h2>
            <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
              <span className="font-mono text-accent font-medium">
                {statusData?.employee?.employeeCode || "EMP-APEX-002"}
              </span>
              <span>&bull;</span>
              <span>{statusData?.currentShift?.name || "General Day Shift (08:00 - 17:00)"}</span>
            </div>
          </div>

          {/* Current Punch State Badge */}
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1.5 ${
              isCheckedIn
                ? "bg-sage text-olive border border-olive/30"
                : "bg-stone/50 text-muted border border-line"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isCheckedIn ? "bg-olive animate-pulse" : "bg-muted"
              }`}
            />
            {isCheckedIn ? "ON DUTY (CHECKED IN)" : "OFF DUTY (CHECKED OUT)"}
          </div>
        </div>
      </div>

      {/* Assigned Construction Site Card */}
      <div className="rounded-lg border border-line bg-panel p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-line pb-2.5">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Building className="h-4 w-4 text-accent" />
            Authorized Construction Site
          </div>
          <span className="rounded bg-stone/60 px-2 py-0.5 font-mono text-[11px] text-graphite font-medium">
            {activeSite?.siteCode || "SITE-SKY-TOWER-A"}
          </span>
        </div>

        {activeSite ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-semibold text-ink text-sm">{activeSite.name}</div>
              <div className="text-muted mt-0.5">{activeSite.addressLine1}</div>
              <div className="text-muted text-[11px]">
                {activeSite.city}, {activeSite.state} - {activeSite.postalCode}
              </div>
            </div>

            <div className="rounded border border-line bg-canvas p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted">Attendance Radius:</span>
                <strong className="font-mono text-accent text-sm">{activeSite.radiusMeters}m</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">GPS Accuracy Ceiling:</span>
                <span className="font-mono text-ink">&le; {activeSite.maxAccuracyMeters}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Site Status:</span>
                <span className="text-olive font-semibold">{activeSite.status}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted py-2">
            No authorized construction site assignment found.
          </div>
        )}
      </div>

      {/* GPS Location Permission & Privacy Invariant Banner */}
      <div className="rounded-md border border-line bg-canvas p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            <Navigation className="h-3.5 w-3.5 text-accent" />
            Browser Geolocation Status
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              permissionState === "granted"
                ? "bg-sage text-olive"
                : permissionState === "denied"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {permissionState}
          </span>
        </div>
        <p className="text-muted text-[11px] leading-relaxed">
          <strong>Privacy Notice:</strong> CONSTRUCT360 adheres to enterprise location privacy rules.
          Your location is <strong>never continuously tracked</strong> and no background tracking runs.
          Coordinates are queried only during your explicit check-in and check-out actions.
        </p>
      </div>

      {/* Simulation / Field Testing Coordinate Selector */}
      <div className="rounded-md border border-dashed border-accent/60 bg-amber-50/40 dark:bg-panel p-3.5 text-xs space-y-2">
        <div className="flex items-center justify-between font-medium text-ink">
          <span className="flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-accent" />
            Field Location Simulation Presets
          </span>
          <span className="text-[10px] text-muted">Verification Playground</span>
        </div>
        <select
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
          className="w-full rounded border border-line bg-canvas p-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent font-medium"
        >
          <option value="REAL_GPS">📡 Real Device GPS (Browser Geolocation API)</option>
          {Object.entries(presets).map(([k, p]) => (
            <option key={k} value={k}>
              {p.label}
            </option>
          ))}
        </select>
        {selectedPreset !== "REAL_GPS" && (
          <p className="text-[11px] text-muted italic">
            &bull; {presets[selectedPreset].description}
          </p>
        )}
      </div>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-red-900">
            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            {errorMessage.title}
          </div>
          <div className="text-[11px] text-red-700 pl-5">{errorMessage.detail}</div>
        </div>
      )}

      {/* Verification Result Card */}
      {punchResult && (
        <div
          className={`rounded-lg border p-4 text-xs space-y-2.5 ${
            punchResult.status === "VERIFIED"
              ? "bg-sage/40 border-sage text-olive"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-1.5">
              {punchResult.status === "VERIFIED" ? (
                <>
                  <CheckCircle className="h-4 w-4 text-olive" />
                  Spatial Geofence Verification Passed
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Outside Configured Geofence Radius
                </>
              )}
            </div>
            <span className="rounded bg-canvas/80 px-2 py-0.5 font-mono text-[10px] font-semibold">
              {punchResult.status}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed font-medium">{punchResult.message}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line/40 text-[11px]">
            <div>
              <span className="text-muted block text-[10px]">Calculated Distance</span>
              <strong className="font-mono">{punchResult.calculatedDistanceMeters}m</strong>
            </div>
            <div>
              <span className="text-muted block text-[10px]">Configured Radius</span>
              <strong className="font-mono">{punchResult.configuredRadiusSnapshotMeters}m</strong>
            </div>
            <div>
              <span className="text-muted block text-[10px]">GPS Accuracy</span>
              <strong className="font-mono">&plusmn;{punchResult.gpsAccuracyMeters}m</strong>
            </div>
            <div>
              <span className="text-muted block text-[10px]">Server Timestamp</span>
              <span className="font-mono">{new Date(punchResult.serverTimestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Big Action Buttons (Check In / Check Out) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <button
          onClick={() => handleInitiatePunch("CLOCK_IN")}
          disabled={Boolean(isCheckedIn) || isLocating || isVerifying}
          className="h-14 rounded-lg bg-ink text-canvas font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
        >
          {isLocating && !isCheckedIn ? (
            <>
              <Compass className="h-4 w-4 animate-spin text-accent" />
              Acquiring High-Accuracy GPS...
            </>
          ) : isVerifying && !isCheckedIn ? (
            <>
              <ShieldCheck className="h-4 w-4 animate-pulse text-accent" />
              PostGIS Authoritative Verification...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-accent" />
              Check In at Site
            </>
          )}
        </button>

        <button
          onClick={() => handleInitiatePunch("CLOCK_OUT")}
          disabled={!isCheckedIn || isLocating || isVerifying}
          className="h-14 rounded-lg border-2 border-ink bg-panel text-ink font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40 transition-all"
        >
          {isLocating && isCheckedIn ? (
            <>
              <Compass className="h-4 w-4 animate-spin text-accent" />
              Acquiring High-Accuracy GPS...
            </>
          ) : isVerifying && isCheckedIn ? (
            <>
              <ShieldCheck className="h-4 w-4 animate-pulse text-accent" />
              Calculating Shift Duration...
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-accent" />
              Check Out from Site
            </>
          )}
        </button>
      </div>

      {/* Today's Punch History */}
      <div className="rounded-lg border border-line bg-panel p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-ink border-b border-line pb-2">
          <span>Today&apos;s Verified Punches</span>
          <span className="text-[11px] font-normal text-muted">
            {statusData?.todayEvents.length || 0} recorded
          </span>
        </div>

        <div className="space-y-2">
          {statusData?.todayEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded border border-line bg-canvas p-2.5 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    ev.isInsideGeofence ? "bg-olive" : "bg-amber-600"
                  }`}
                />
                <div>
                  <div className="font-semibold text-ink">{ev.eventType}</div>
                  <div className="text-[10px] text-muted">
                    Distance: <strong>{ev.calculatedDistanceMeters}m</strong> &bull; Accuracy:{" "}
                    <strong>&plusmn;{ev.gpsAccuracyMeters}m</strong>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs text-ink block">
                  {new Date(ev.serverTimestamp).toLocaleTimeString()}
                </span>
                <span className="text-[10px] text-muted font-medium">
                  {ev.isInsideGeofence ? "Inside Geofence" : "Outside Geofence"}
                </span>
              </div>
            </div>
          ))}

          {(!statusData?.todayEvents || statusData.todayEvents.length === 0) && (
            <div className="py-4 text-center text-xs text-muted">
              No punch events recorded for today yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
