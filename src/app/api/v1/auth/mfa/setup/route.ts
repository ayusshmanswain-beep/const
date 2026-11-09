// ==============================================================================
// POST /api/v1/auth/mfa/setup
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { authService } from "@/server/modules/auth/auth.service";

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const result = await authService.setupMfa(ctx.user.id);
  return jsonOk(result, undefined, undefined, requestId);
});
