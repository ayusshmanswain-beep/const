// ==============================================================================
// GET /api/v1/notifications
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { notificationService } from "@/server/modules/notification/notification.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";

  const { data, meta, unreadCount } = await notificationService.getMyNotifications(ctx, {
    ...pagination,
    unreadOnly,
  });

  return jsonOk({ items: data, unreadCount }, meta, undefined, requestId);
});
