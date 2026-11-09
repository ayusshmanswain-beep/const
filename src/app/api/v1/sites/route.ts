// ==============================================================================
// GET /api/v1/sites & POST /api/v1/sites
// Multi-Tenant Authorized Construction Sites Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { siteService } from "@/server/modules/site/site.service";

const CreateSiteSchema = z.object({
  projectId: z.string().uuid(),
  siteCode: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  siteEngineerId: z.string().uuid().optional(),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(3),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(10).max(50000),
  maxAccuracyMeters: z.number().min(5).max(500).optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const status = (req.nextUrl.searchParams.get("status") as any) || undefined;
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;

  const { data, meta } = await siteService.listSites(ctx, {
    ...pagination,
    search,
    status,
    projectId,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateSiteSchema.parse(body);

  const result = await siteService.createSite(validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
