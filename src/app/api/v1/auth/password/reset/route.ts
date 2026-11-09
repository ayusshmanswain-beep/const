// ==============================================================================
// POST /api/v1/auth/password/reset
// ==============================================================================

import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { authService } from "@/server/modules/auth/auth.service";
import { PasswordResetConfirmSchema } from "@/server/modules/auth/auth.types";

export const POST = createRouteHandler(
  async (req, { requestId }) => {
    const body = await req.json();
    const validated = PasswordResetConfirmSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await authService.confirmPasswordReset(validated, { ipAddress, userAgent });

    return jsonOk(result, undefined, undefined, requestId);
  },
  { enableCsrf: false }
);
