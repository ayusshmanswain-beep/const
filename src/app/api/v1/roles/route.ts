// ==============================================================================
// GET & POST /api/v1/roles
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { roleService } from "@/server/modules/role/role.service";
import { CreateRoleSchema } from "@/server/modules/role/role.types";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const roles = await roleService.listRoles(ctx.companyId, ctx);
  return jsonOk(roles, undefined, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateRoleSchema.parse(body);

  const role = await roleService.createRole(ctx.companyId, validated, ctx);
  return jsonCreated(role, undefined, requestId);
});
