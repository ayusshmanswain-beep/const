// ==============================================================================
// POST /api/v1/notifications/[id]/read
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { notificationService } from "@/server/modules/notification/notification.service";

interface RouteParams {
  id: string;
}

export const POST = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const notification = await notificationService.markAsRead(params.id, ctx);
  return jsonOk(notification, undefined, undefined, requestId);
});
