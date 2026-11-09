// ==============================================================================
// GET /api/v1/users
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { userService } from "@/server/modules/user/user.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);

  const { data, meta } = await userService.listUsers(ctx.companyId, pagination, ctx);
  return jsonOk(data, meta, undefined, requestId);
});
