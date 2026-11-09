"use client";

// ==============================================================================
// CONSTRUCT360 INTERACTIVE POSTGIS GEOFENCE MAP (Leaflet + Turf.js)
// ==============================================================================

import React, { useEffect, useRef, useState } from "react";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";

interface SiteMapMarker {
  id: string;
  name: string;
  siteCode: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: string;
}

interface PunchMapMarker {
  id: string;
  workerName: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  isInside: boolean;
  accuracyMeters: number;
  eventType: string;
  timestamp: string;
}

interface GeofenceMapProps {
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
  sites?: SiteMapMarker[];
  activeSite?: SiteMapMarker | null;
  punches?: PunchMapMarker[];
  isEditable?: boolean;
  onPositionChange?: (lat: number, lon: number) => void;
  radiusMeters?: number;
  onRadiusChange?: (radius: number) => void;
  className?: string;
}

export default function GeofenceMap({
  centerLat = 12.935242,
  centerLon = 77.694602,
  zoom = 16,
  sites = [],
  activeSite = null,
  punches = [],
  isEditable = false,
  onPositionChange,
  radiusMeters = 150,
  onRadiusChange,
  className = "h-[450px] w-full rounded-md border border-line",
}: GeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);

  const [currentLat, setCurrentLat] = useState(centerLat);
  const [currentLon, setCurrentLon] = useState(centerLon);
  const [currentRadius, setCurrentRadius] = useState(radiusMeters);
  const [coverageAreaSqM, setCoverageAreaSqM] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Compute coverage area using Turf.js
  useEffect(() => {
    try {
      const centerPoint = turf.point([currentLon, currentLat]);
      const circlePoly = turf.circle(centerPoint, currentRadius, {
        steps: 64,
        units: "meters",
      });
      const area = turf.area(circlePoly);
      setCoverageAreaSqM(Math.round(area));
    } catch {
      // Fallback: pi * r^2
      setCoverageAreaSqM(Math.round(Math.PI * currentRadius * currentRadius));
    }
  }, [currentLat, currentLon, currentRadius]);

  // Synchronize internal state with external props
  useEffect(() => {
    setCurrentLat(centerLat);
    setCurrentLon(centerLon);
  }, [centerLat, centerLon]);

  useEffect(() => {
    setCurrentRadius(radiusMeters);
  }, [radiusMeters]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    async function initMap() {
      const L = (await import("leaflet")).default;

      if (!mapContainerRef.current || !isMounted) return;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // CartoDB Positron / OSM tiles for architectural clarity
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
          maxZoom: 19,
        }
      ).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      // Custom div icons
      const createSiteIcon = (code: string) =>
        L.divIcon({
          className: "custom-site-pin",
          html: `<div style="background-color: #242725; color: #f4f2ec; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid #aa8a61; white-space: nowrap; transform: translate(-50%, -100%); display: flex; align-items: center; gap: 4px;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#aa8a61;"></span>
            ${code}
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

      if (isEditable) {
        // Editable Marker & Geofence Circle
        const editableMarker = L.marker([centerLat, centerLon], {
          draggable: true,
          icon: createSiteIcon("NEW SITE"),
        }).addTo(layersGroup);
        markerRef.current = editableMarker;

        const geofenceCircle = L.circle([centerLat, centerLon], {
          radius: currentRadius,
          color: "#aa8a61",
          fillColor: "#aa8a61",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "4, 6",
        }).addTo(layersGroup);
        circleRef.current = geofenceCircle;

        editableMarker.on("drag", (e: any) => {
          const latlng = e.target.getLatLng();
          geofenceCircle.setLatLng(latlng);
          setCurrentLat(Math.round(latlng.lat * 1000000) / 1000000);
          setCurrentLon(Math.round(latlng.lng * 1000000) / 1000000);
        });

        editableMarker.on("dragend", (e: any) => {
          const latlng = e.target.getLatLng();
          const cleanLat = Math.round(latlng.lat * 1000000) / 1000000;
          const cleanLon = Math.round(latlng.lng * 1000000) / 1000000;
          onPositionChange?.(cleanLat, cleanLon);
        });

        map.on("click", (e: any) => {
          const lat = Math.round(e.latlng.lat * 1000000) / 1000000;
          const lon = Math.round(e.latlng.lng * 1000000) / 1000000;
          editableMarker.setLatLng([lat, lon]);
          geofenceCircle.setLatLng([lat, lon]);
          setCurrentLat(lat);
          setCurrentLon(lon);
          onPositionChange?.(lat, lon);
        });
      } else {
        // Render sites list
        sites.forEach((site) => {
          const isSelected = activeSite?.id === site.id;
          const circleColor = isSelected ? "#aa8a61" : "#3e6b4f";

          L.circle([site.latitude, site.longitude], {
            radius: site.radiusMeters,
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: isSelected ? 0.2 : 0.08,
            weight: isSelected ? 2.5 : 1.5,
          }).addTo(layersGroup);

          const m = L.marker([site.latitude, site.longitude], {
            icon: createSiteIcon(site.siteCode),
          }).addTo(layersGroup);

          m.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #242725;">
              <strong style="display:block; margin-bottom: 2px;">${site.name}</strong>
              <div style="color: #5f6554;">Radius: <strong>${site.radiusMeters}m</strong></div>
              <div style="color: #5f6554;">Status: <span style="color:#3e6b4f; font-weight:600;">${site.status}</span></div>
              <div style="color: #858c70; font-size: 10px; margin-top: 4px;">Lat: ${site.latitude.toFixed(6)}, Lon: ${site.longitude.toFixed(6)}</div>
            </div>
          `);
        });

        // Render punch markers if any
        punches.forEach((punch) => {
          const punchColor = punch.isInside ? "#3e6b4f" : "#8c3a32";
          const punchIcon = L.divIcon({
            className: "punch-pin",
            html: `<div style="background-color: ${punchColor}; color: white; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); transform: translate(-50%, -50%);"></div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });

          const pm = L.marker([punch.latitude, punch.longitude], { icon: punchIcon }).addTo(
            layersGroup
          );

          pm.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #242725;">
              <strong>${punch.workerName}</strong>
              <div style="color: ${punchColor}; font-weight: 600; margin-top: 2px;">${
            punch.isInside ? "Inside Perimeter" : "Outside Perimeter"
          }</div>
              <div style="color: #5f6554; font-size: 11px;">Distance from center: <strong>${
                punch.distanceMeters
              }m</strong></div>
              <div style="color: #5f6554; font-size: 11px;">GPS Accuracy: <strong>${
                punch.accuracyMeters
              }m</strong></div>
              <div style="color: #858c70; font-size: 10px; margin-top: 4px;">Time: ${punch.timestamp}</div>
            </div>
          `);
        });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLon, zoom, isEditable, sites, activeSite, punches]);

  // Update circle radius when radius slider changes in editable mode
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(currentRadius);
    }
  }, [currentRadius]);

  // Geocoding Postal Address Search via OpenStreetMap Nominatim
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCurrentLat(lat);
        setCurrentLon(lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 17);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lon]);
        }
        onPositionChange?.(lat, lon);
      }
    } catch {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-2">
      {isEditable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-panel p-3 border border-line text-xs">
          {/* Address Search */}
          <form onSubmit={handleAddressSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address or landmark..."
              className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="rounded bg-ink px-3 py-1.5 font-medium text-canvas hover:opacity-90 disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Radius Slider */}
          <div className="flex items-center gap-3">
            <label className="font-medium text-muted">
              Radius: <span className="font-semibold text-ink">{currentRadius}m</span>
            </label>
            <input
              type="range"
              min={20}
              max={1000}
              step={10}
              value={currentRadius}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentRadius(val);
                onRadiusChange?.(val);
              }}
              className="h-1.5 w-32 cursor-pointer accent-[#aa8a61]"
            />
          </div>

          {/* Turf Preview Area Pill */}
          <div className="flex items-center gap-2 rounded bg-sage/40 px-2.5 py-1 text-olive">
            <span>Turf Preview Area:</span>
            <strong>
              {coverageAreaSqM > 10000
                ? `${(coverageAreaSqM / 10000).toFixed(2)} ha`
                : `${coverageAreaSqM.toLocaleString()} m²`}
            </strong>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className={className} />

      {isEditable && (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Click anywhere or drag marker to set exact site centroid.</span>
          <span className="font-mono">
            Lat: {currentLat.toFixed(6)}, Lon: {currentLon.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
