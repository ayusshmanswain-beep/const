// ==============================================================================
// GET & PATCH /api/v1/users/[id]
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { userService } from "@/server/modules/user/user.service";
import { UpdateUserSchema } from "@/server/modules/user/user.types";

interface RouteParams {
  id: string;
}

export const GET = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const user = await userService.getUser(params.id, ctx.companyId, ctx);
  return jsonOk(user, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateUserSchema.parse(body);

  const updated = await userService.updateUser(params.id, ctx.companyId, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
