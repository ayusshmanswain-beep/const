// ==============================================================================
// GET /api/v1/workforce/portal/profile
// Self-Service Authenticated Employee Profile
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const profile = await workforceService.getMyProfile(ctx);
  return jsonOk(profile, undefined, undefined, requestId);
});
