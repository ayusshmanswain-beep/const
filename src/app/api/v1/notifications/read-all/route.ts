// ==============================================================================
// POST /api/v1/notifications/read-all
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { notificationService } from "@/server/modules/notification/notification.service";

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const result = await notificationService.markAllAsRead(ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
