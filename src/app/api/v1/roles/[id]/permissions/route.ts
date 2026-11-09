// ==============================================================================
// POST /api/v1/roles/[id]/permissions
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { roleService } from "@/server/modules/role/role.service";
import { AssignPermissionsSchema } from "@/server/modules/role/role.types";

interface RouteParams {
  id: string;
}

export const POST = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = AssignPermissionsSchema.parse(body);

  const result = await roleService.assignPermissions(params.id, ctx.companyId, validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
