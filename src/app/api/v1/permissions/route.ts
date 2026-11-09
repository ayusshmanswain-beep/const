// ==============================================================================
// GET /api/v1/permissions
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { permissionService } from "@/server/modules/permission/permission.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const permissions = await permissionService.listPermissions(ctx);
  return jsonOk(permissions, undefined, undefined, requestId);
});
