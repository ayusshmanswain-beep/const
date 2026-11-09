// ==============================================================================
// SITE SERVICE
// Business Logic for Multi-Tenant Sites, PostGIS Geofences & Worker Assignments
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission, requireTenant } from "../../auth/guards";
import { BadRequestError, ConflictError, NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import { db } from "../../db/client";
import type { DbSite, DbSiteAssignment, DbSiteGeofence, DbSiteGeofenceHistory } from "../../db/types";
import { auditService } from "../audit/audit.service";
import { GeospatialEngine } from "../geospatial/geospatial.engine";
import { siteRepository, type SiteRepository } from "./site.repository";
import type {
  AssignWorkerInput,
  CreateSiteInput,
  QuerySitesParams,
  SiteWithDetails,
  UpdateSiteInput,
  UpdateSiteRadiusInput,
} from "./site.types";

export class SiteService {
  private readonly repo: SiteRepository;

  constructor(repo: SiteRepository = siteRepository) {
    this.repo = repo;
  }

  public async getSite(id: string, ctx: SecurityContext): Promise<SiteWithDetails> {
    requirePermission(ctx, "View", "sites");

    const site = await this.repo.findById(id);
    if (!site) {
      throw new NotFoundError("Site", id);
    }

    requireTenant(ctx, site.companyId);

    const store = db.getStore();
    const geofence = await this.repo.findActiveGeofenceBySiteId(id);
    const assignments = await this.repo.findAssignments(id);
    const project = store.projects.get(site.projectId);
    const engineer = site.siteEngineerId ? store.employees.get(site.siteEngineerId) : undefined;

    return {
      ...site,
      activeGeofence: geofence || undefined,
      assignmentsCount: assignments.filter((a) => a.isActive).length,
      projectName: project?.name,
      siteEngineerName: engineer ? `${engineer.firstName} ${engineer.lastName}` : undefined,
    };
  }

  public async listSites(
    ctx: SecurityContext,
    params: QuerySitesParams
  ): Promise<{ data: SiteWithDetails[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "sites");

    const { data, total } = await this.repo.findCompanySites(ctx.companyId, params);
    const store = db.getStore();

    const enriched: SiteWithDetails[] = await Promise.all(
      data.map(async (site) => {
        const geofence = await this.repo.findActiveGeofenceBySiteId(site.id);
        const assignments = await this.repo.findAssignments(site.id);
        const project = store.projects.get(site.projectId);
        const engineer = site.siteEngineerId ? store.employees.get(site.siteEngineerId) : undefined;

        return {
          ...site,
          activeGeofence: geofence || undefined,
          assignmentsCount: assignments.filter((a) => a.isActive).length,
          projectName: project?.name,
          siteEngineerName: engineer ? `${engineer.firstName} ${engineer.lastName}` : undefined,
        };
      })
    );

    const meta = createPaginationMeta(params.page || 1, params.limit || 20, total);
    return { data: enriched, meta };
  }

  public async createSite(
    input: CreateSiteInput,
    ctx: SecurityContext
  ): Promise<{ site: DbSite; geofence: DbSiteGeofence }> {
    requireTenant(ctx, ctx.companyId);
    requirePermission(ctx, "Create", "sites");

    // 1. Validate Coordinates
    const coordValidation = GeospatialEngine.validateCoordinates(input.latitude, input.longitude);
    if (!coordValidation.valid) {
      throw new BadRequestError(coordValidation.reason || "Invalid coordinates");
    }

    // 2. Validate Radius
    if (!input.radiusMeters || input.radiusMeters < 10 || input.radiusMeters > 50000) {
      throw new BadRequestError("Site attendance radius must be between 10 meters and 50,000 meters");
    }

    // 3. Unique site code within company
    const existing = await this.repo.findByCode(ctx.companyId, input.siteCode);
    if (existing) {
      throw new ConflictError(`Site with code '${input.siteCode}' already exists in this organization`);
    }

    const { site, geofence } = await this.repo.create(ctx.companyId, input, ctx.user.id);

    await auditService.logEvent({
      companyId: ctx.companyId,
      actorUserId: ctx.user.id,
      action: "CREATE_SITE",
      tableName: "sites",
      recordId: site.id,
      newData: {
        siteCode: site.siteCode,
        name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        radiusMeters: site.radiusMeters,
      },
    });

    return { site, geofence };
  }

  public async updateSite(id: string, input: UpdateSiteInput, ctx: SecurityContext): Promise<DbSite> {
    requirePermission(ctx, "Update", "sites");

    const site = await this.repo.findById(id);
    if (!site) {
      throw new NotFoundError("Site", id);
    }
    requireTenant(ctx, site.companyId);

    if (input.latitude !== undefined || input.longitude !== undefined) {
      const targetLat = input.latitude ?? site.latitude;
      const targetLon = input.longitude ?? site.longitude;
      const coordVal = GeospatialEngine.validateCoordinates(targetLat, targetLon);
      if (!coordVal.valid) {
        throw new BadRequestError(coordVal.reason || "Invalid coordinates");
      }
    }

    if (input.radiusMeters !== undefined) {
      if (input.radiusMeters < 10 || input.radiusMeters > 50000) {
        throw new BadRequestError("Site attendance radius must be between 10 meters and 50,000 meters");
      }
    }

    const updated = await this.repo.update(id, input, ctx.user.id);
    if (!updated) {
      throw new NotFoundError("Site", id);
    }

    await auditService.logEvent({
      companyId: site.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_SITE",
      tableName: "sites",
      recordId: id,
      oldData: {
        name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        radiusMeters: site.radiusMeters,
        status: site.status,
      },
      newData: {
        name: updated.name,
        latitude: updated.latitude,
        longitude: updated.longitude,
        radiusMeters: updated.radiusMeters,
        status: updated.status,
      },
    });

    return updated;
  }

  public async updateRadius(
    siteId: string,
    input: UpdateSiteRadiusInput,
    ctx: SecurityContext
  ): Promise<DbSite> {
    requirePermission(ctx, "Update", "sites");

    const site = await this.repo.findById(siteId);
    if (!site) {
      throw new NotFoundError("Site", siteId);
    }
    requireTenant(ctx, site.companyId);

    if (!input.radiusMeters || input.radiusMeters < 10 || input.radiusMeters > 50000) {
      throw new BadRequestError("Site radius must be between 10m and 50,000m");
    }

    const updated = await this.repo.updateRadius(
      siteId,
      input.radiusMeters,
      ctx.user.id,
      input.reason || "Administrative radius recalibration"
    );

    if (!updated) {
      throw new NotFoundError("Site", siteId);
    }

    await auditService.logEvent({
      companyId: site.companyId,
      actorUserId: ctx.user.id,
      action: "UPDATE_SITE_GEOFENCE_RADIUS",
      tableName: "site_geofences",
      recordId: siteId,
      oldData: { radiusMeters: site.radiusMeters },
      newData: { radiusMeters: input.radiusMeters, reason: input.reason },
    });

    return updated;
  }

  public async getGeofenceHistory(siteId: string, ctx: SecurityContext): Promise<DbSiteGeofenceHistory[]> {
    requirePermission(ctx, "View", "sites");

    const site = await this.repo.findById(siteId);
    if (!site) {
      throw new NotFoundError("Site", siteId);
    }
    requireTenant(ctx, site.companyId);

    return this.repo.getGeofenceHistory(siteId);
  }

  public async getAssignments(siteId: string, ctx: SecurityContext): Promise<DbSiteAssignment[]> {
    requirePermission(ctx, "View", "sites");

    const site = await this.repo.findById(siteId);
    if (!site) {
      throw new NotFoundError("Site", siteId);
    }
    requireTenant(ctx, site.companyId);

    return this.repo.findAssignments(siteId);
  }

  public async assignWorker(
    siteId: string,
    input: AssignWorkerInput,
    ctx: SecurityContext
  ): Promise<DbSiteAssignment> {
    requirePermission(ctx, "Update", "sites");

    const site = await this.repo.findById(siteId);
    if (!site) {
      throw new NotFoundError("Site", siteId);
    }
    requireTenant(ctx, site.companyId);

    if (input.assigneeType === "EMPLOYEE" && !input.employeeId) {
      throw new BadRequestError("employeeId is required for employee assignment");
    }

    if (input.assigneeType === "LABOURER" && !input.labourerId) {
      throw new BadRequestError("labourerId is required for labourer assignment");
    }

    const assignment = await this.repo.assignWorker(site.companyId, siteId, input);

    await auditService.logEvent({
      companyId: site.companyId,
      actorUserId: ctx.user.id,
      action: "ASSIGN_WORKER_TO_SITE",
      tableName: "site_assignments",
      recordId: assignment.id,
      newData: {
        siteId,
        assigneeType: input.assigneeType,
        employeeId: input.employeeId,
        labourerId: input.labourerId,
        roleOnSite: input.roleOnSite,
      },
    });

    return assignment;
  }

  public async removeAssignment(
    siteId: string,
    assignmentId: string,
    ctx: SecurityContext
  ): Promise<void> {
    requirePermission(ctx, "Update", "sites");

    const site = await this.repo.findById(siteId);
    if (!site) {
      throw new NotFoundError("Site", siteId);
    }
    requireTenant(ctx, site.companyId);

    const success = await this.repo.removeAssignment(assignmentId);
    if (!success) {
      throw new NotFoundError("SiteAssignment", assignmentId);
    }

    await auditService.logEvent({
      companyId: site.companyId,
      actorUserId: ctx.user.id,
      action: "DEACTIVATE_SITE_ASSIGNMENT",
      tableName: "site_assignments",
      recordId: assignmentId,
    });
  }
}

export const siteService = new SiteService();
