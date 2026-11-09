// ==============================================================================
// PATCH /api/v1/users/[id]/status
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { userService } from "@/server/modules/user/user.service";
import { ToggleUserStatusSchema } from "@/server/modules/user/user.types";

interface RouteParams {
  id: string;
}

export const PATCH = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ToggleUserStatusSchema.parse(body);

  const updated = await userService.toggleStatus(params.id, ctx.companyId, validated.isActive, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
