// ==============================================================================
// GET & PATCH /api/v1/roles/[id]
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { roleService } from "@/server/modules/role/role.service";
import { UpdateRoleSchema } from "@/server/modules/role/role.types";

interface RouteParams {
  id: string;
}

export const GET = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const role = await roleService.getRole(params.id, ctx.companyId, ctx);
  return jsonOk(role, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateRoleSchema.parse(body);

  const updated = await roleService.updateRole(params.id, ctx.companyId, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
