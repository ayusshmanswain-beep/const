// ==============================================================================
// GET /api/v1/workforce/portal/announcements
// Self-Service Company & Site Bulletins
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const announcements = await workforceService.getAnnouncements(ctx);
  return jsonOk(announcements, undefined, undefined, requestId);
});
