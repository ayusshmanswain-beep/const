// ==============================================================================
// SITE REPOSITORY
// Authorized Construction Sites, PostGIS Geofences & Personnel Assignment Storage
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type {
  DbSite,
  DbSiteAssignment,
  DbSiteGeofence,
  DbSiteGeofenceHistory,
} from "../../db/types";
import type {
  AssignWorkerInput,
  CreateSiteInput,
  QuerySitesParams,
  UpdateSiteInput,
} from "./site.types";

export class SiteRepository {
  public async findById(id: string): Promise<DbSite | null> {
    const store = db.getStore();
    return store.sites.get(id) || null;
  }

  public async findByCode(companyId: string, siteCode: string): Promise<DbSite | null> {
    const store = db.getStore();
    for (const site of store.sites.values()) {
      if (site.companyId === companyId && site.siteCode.toLowerCase() === siteCode.toLowerCase()) {
        return site;
      }
    }
    return null;
  }

  public async findCompanySites(
    companyId: string,
    params: QuerySitesParams
  ): Promise<{ data: DbSite[]; total: number }> {
    const store = db.getStore();

    let list = Array.from(store.sites.values()).filter((s) => s.companyId === companyId);

    if (params.projectId) {
      list = list.filter((s) => s.projectId === params.projectId);
    }

    if (params.status) {
      list = list.filter((s) => s.status === params.status);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.siteCode.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = list.slice(offset, offset + limit);
    return { data, total };
  }

  public async create(
    companyId: string,
    input: CreateSiteInput,
    userId: string
  ): Promise<{ site: DbSite; geofence: DbSiteGeofence }> {
    return db.transaction(async (store) => {
      const now = new Date();
      const siteId = randomUUID();

      const site: DbSite = {
        id: siteId,
        companyId,
        projectId: input.projectId,
        siteCode: input.siteCode.toUpperCase().trim(),
        name: input.name.trim(),
        description: input.description,
        siteEngineerId: input.siteEngineerId || null,
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2?.trim() || null,
        city: input.city.trim(),
        state: input.state.trim(),
        postalCode: input.postalCode.trim(),
        status: "ACTIVE_CONSTRUCTION",
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        maxAccuracyMeters: input.maxAccuracyMeters ?? 50.0,
        createdAt: now,
        updatedAt: now,
      };

      store.sites.set(site.id, site);

      // Create linked circular geofence
      const geofenceId = randomUUID();
      const geofence: DbSiteGeofence = {
        id: geofenceId,
        companyId,
        siteId: site.id,
        name: `${site.name} Attendance Geofence (${input.radiusMeters}m)`,
        geofenceType: "CIRCULAR",
        centerLatitude: input.latitude,
        centerLongitude: input.longitude,
        radiusMeters: input.radiusMeters,
        isActive: true,
        metadata: {
          maxAccuracyMeters: input.maxAccuracyMeters ?? 50.0,
          gracePeriodMinutes: 15,
        },
        createdAt: now,
        updatedAt: now,
      };

      store.geofences.set(geofence.id, geofence);

      // Maintain geofence history log
      const historyEntry: DbSiteGeofenceHistory = {
        id: randomUUID(),
        companyId,
        siteId: site.id,
        geofenceId: geofence.id,
        changedByUserId: userId,
        oldRadiusMeters: 0,
        newRadiusMeters: input.radiusMeters,
        oldCenterLatitude: null,
        newCenterLatitude: input.latitude,
        oldCenterLongitude: null,
        newCenterLongitude: input.longitude,
        reason: "Initial authorized site perimeter configuration",
        timestamp: now,
      };

      store.geofenceHistories.push(historyEntry);

      return { site, geofence };
    });
  }

  public async update(
    siteId: string,
    input: UpdateSiteInput,
    userId: string
  ): Promise<DbSite | null> {
    return db.transaction(async (store) => {
      const site = store.sites.get(siteId);
      if (!site) return null;

      const now = new Date();
      const oldRadius = site.radiusMeters;
      const oldLat = site.latitude;
      const oldLon = site.longitude;

      if (input.name !== undefined) site.name = input.name;
      if (input.description !== undefined) site.description = input.description;
      if (input.siteEngineerId !== undefined) site.siteEngineerId = input.siteEngineerId;
      if (input.addressLine1 !== undefined) site.addressLine1 = input.addressLine1;
      if (input.addressLine2 !== undefined) site.addressLine2 = input.addressLine2;
      if (input.city !== undefined) site.city = input.city;
      if (input.state !== undefined) site.state = input.state;
      if (input.postalCode !== undefined) site.postalCode = input.postalCode;
      if (input.status !== undefined) site.status = input.status;
      if (input.latitude !== undefined) site.latitude = input.latitude;
      if (input.longitude !== undefined) site.longitude = input.longitude;
      if (input.maxAccuracyMeters !== undefined) site.maxAccuracyMeters = input.maxAccuracyMeters;

      let radiusChanged = false;
      if (input.radiusMeters !== undefined && input.radiusMeters !== oldRadius) {
        site.radiusMeters = input.radiusMeters;
        radiusChanged = true;
      }

      site.updatedAt = now;

      // Update active geofence
      const geofence = Array.from(store.geofences.values()).find(
        (g) => g.siteId === siteId && g.isActive
      );

      if (geofence) {
        if (input.latitude !== undefined) geofence.centerLatitude = input.latitude;
        if (input.longitude !== undefined) geofence.centerLongitude = input.longitude;
        if (input.radiusMeters !== undefined) geofence.radiusMeters = input.radiusMeters;
        geofence.updatedAt = now;

        if (
          radiusChanged ||
          (input.latitude !== undefined && input.latitude !== oldLat) ||
          (input.longitude !== undefined && input.longitude !== oldLon)
        ) {
          store.geofenceHistories.push({
            id: randomUUID(),
            companyId: site.companyId,
            siteId: site.id,
            geofenceId: geofence.id,
            changedByUserId: userId,
            oldRadiusMeters: oldRadius,
            newRadiusMeters: site.radiusMeters,
            oldCenterLatitude: oldLat,
            newCenterLatitude: site.latitude,
            oldCenterLongitude: oldLon,
            newCenterLongitude: site.longitude,
            reason: input.reason || "Site coordinates or radius adjustment",
            timestamp: now,
          });
        }
      }

      return site;
    });
  }

  public async updateRadius(
    siteId: string,
    newRadiusMeters: number,
    userId: string,
    reason: string
  ): Promise<DbSite | null> {
    return db.transaction(async (store) => {
      const site = store.sites.get(siteId);
      if (!site) return null;

      const now = new Date();
      const oldRadius = site.radiusMeters;
      site.radiusMeters = newRadiusMeters;
      site.updatedAt = now;

      const geofence = Array.from(store.geofences.values()).find(
        (g) => g.siteId === siteId && g.isActive
      );

      if (geofence) {
        geofence.radiusMeters = newRadiusMeters;
        geofence.name = `${site.name} Attendance Geofence (${newRadiusMeters}m)`;
        geofence.updatedAt = now;

        store.geofenceHistories.push({
          id: randomUUID(),
          companyId: site.companyId,
          siteId: site.id,
          geofenceId: geofence.id,
          changedByUserId: userId,
          oldRadiusMeters: oldRadius,
          newRadiusMeters: newRadiusMeters,
          oldCenterLatitude: site.latitude,
          newCenterLatitude: site.latitude,
          oldCenterLongitude: site.longitude,
          newCenterLongitude: site.longitude,
          reason,
          timestamp: now,
        });
      }

      return site;
    });
  }

  public async findActiveGeofenceBySiteId(siteId: string): Promise<DbSiteGeofence | null> {
    const store = db.getStore();
    for (const g of store.geofences.values()) {
      if (g.siteId === siteId && g.isActive) {
        return g;
      }
    }
    return null;
  }

  public async getGeofenceHistory(siteId: string): Promise<DbSiteGeofenceHistory[]> {
    const store = db.getStore();
    return store.geofenceHistories
      .filter((h) => h.siteId === siteId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async findAssignments(siteId: string): Promise<DbSiteAssignment[]> {
    const store = db.getStore();
    return Array.from(store.siteAssignments.values()).filter((a) => a.siteId === siteId);
  }

  public async findActiveWorkerAssignment(
    siteId: string,
    workerType: "EMPLOYEE" | "LABOURER",
    workerId: string,
    date: Date = new Date()
  ): Promise<DbSiteAssignment | null> {
    const store = db.getStore();
    for (const a of store.siteAssignments.values()) {
      if (a.siteId === siteId && a.isActive && a.assigneeType === workerType) {
        const matchesWorker =
          workerType === "EMPLOYEE" ? a.employeeId === workerId : a.labourerId === workerId;

        if (matchesWorker) {
          // Check assignment date bounds: assignedFrom <= date, and if assignedTo exists, date <= assignedTo
          const from = new Date(a.assignedFrom).getTime();
          const target = date.getTime();
          const to = a.assignedTo ? new Date(a.assignedTo).getTime() : Infinity;

          if (target >= from && target <= to) {
            return a;
          }
        }
      }
    }
    return null;
  }

  public async assignWorker(
    companyId: string,
    siteId: string,
    input: AssignWorkerInput
  ): Promise<DbSiteAssignment> {
    return db.transaction(async (store) => {
      const now = new Date();
      const assignment: DbSiteAssignment = {
        id: randomUUID(),
        companyId,
        siteId,
        assigneeType: input.assigneeType,
        employeeId: input.employeeId || null,
        labourerId: input.labourerId || null,
        roleOnSite: input.roleOnSite || null,
        assignedFrom: new Date(input.assignedFrom),
        assignedTo: input.assignedTo ? new Date(input.assignedTo) : null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      store.siteAssignments.set(assignment.id, assignment);
      return assignment;
    });
  }

  public async removeAssignment(assignmentId: string): Promise<boolean> {
    return db.transaction(async (store) => {
      const assignment = store.siteAssignments.get(assignmentId);
      if (!assignment) return false;
      assignment.isActive = false;
      assignment.updatedAt = new Date();
      return true;
    });
  }
}

export const siteRepository = new SiteRepository();
