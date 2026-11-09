// ==============================================================================
// GET & PATCH /api/v1/sites/[id]
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { siteService } from "@/server/modules/site/site.service";

const UpdateSiteSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  siteEngineerId: z.string().uuid().optional(),
  addressLine1: z.string().min(3).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  postalCode: z.string().min(3).optional(),
  status: z
    .enum([
      "PREPARATION",
      "ACTIVE_CONSTRUCTION",
      "FINISHING",
      "HANDOVER",
      "MAINTENANCE",
      "CLOSED",
    ])
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().min(10).max(50000).optional(),
  maxAccuracyMeters: z.number().min(5).max(500).optional(),
  reason: z.string().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const site = await siteService.getSite(params.id, ctx);
  return jsonOk(site, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateSiteSchema.parse(body);

  const updated = await siteService.updateSite(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
