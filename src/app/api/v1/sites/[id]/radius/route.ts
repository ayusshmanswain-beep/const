// ==============================================================================
// PUT /api/v1/sites/[id]/radius
// Database Geofence Radius Reconfiguration with Historical Audit Log
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { siteService } from "@/server/modules/site/site.service";

const UpdateRadiusSchema = z.object({
  radiusMeters: z.number().min(10).max(50000),
  reason: z.string().min(3).max(500),
});

export const PUT = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateRadiusSchema.parse(body);

  const updated = await siteService.updateRadius(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
