// ==============================================================================
// POST /api/v1/auth/mfa/verify
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { authService } from "@/server/modules/auth/auth.service";
import { MfaVerifySchema } from "@/server/modules/auth/auth.types";

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = MfaVerifySchema.parse(body);

  const result = await authService.verifyMfaSetup(ctx.user.id, validated.code);
  return jsonOk(result, undefined, undefined, requestId);
});
