// ==============================================================================
// GET /api/v1/sites/[id]/history
// Complete Geofence Configuration History
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { siteService } from "@/server/modules/site/site.service";

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const history = await siteService.getGeofenceHistory(params.id, ctx);
  return jsonOk(history, undefined, undefined, requestId);
});
