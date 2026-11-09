// ==============================================================================
// POST /api/v1/users/[id]/roles
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { userService } from "@/server/modules/user/user.service";
import { AssignRolesSchema } from "@/server/modules/user/user.types";

interface RouteParams {
  id: string;
}

export const POST = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = AssignRolesSchema.parse(body);

  const result = await userService.assignRoles(params.id, ctx.companyId, validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
