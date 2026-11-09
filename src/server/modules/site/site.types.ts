// ==============================================================================
// SITE MODULE TYPES
// ==============================================================================

import type { AssigneeWorkerType, DbSite, DbSiteAssignment, DbSiteGeofence, DbSiteGeofenceHistory, SiteStatusType } from "../../db/types";

export interface CreateSiteInput {
  projectId: string;
  siteCode: string;
  name: string;
  description?: string;
  siteEngineerId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Database-driven site radius (e.g. 150m)
  maxAccuracyMeters?: number;
}

export interface UpdateSiteInput {
  name?: string;
  description?: string;
  siteEngineerId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  status?: SiteStatusType;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  maxAccuracyMeters?: number;
  reason?: string;
}

export interface UpdateSiteRadiusInput {
  radiusMeters: number;
  reason: string;
}

export interface AssignWorkerInput {
  assigneeType: AssigneeWorkerType;
  employeeId?: string;
  labourerId?: string;
  roleOnSite?: string;
  assignedFrom: string; // YYYY-MM-DD
  assignedTo?: string;   // YYYY-MM-DD
}

export interface QuerySitesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SiteStatusType;
  projectId?: string;
}

export interface SiteWithDetails extends DbSite {
  activeGeofence?: DbSiteGeofence;
  assignmentsCount: number;
  siteEngineerName?: string;
  projectName?: string;
}
