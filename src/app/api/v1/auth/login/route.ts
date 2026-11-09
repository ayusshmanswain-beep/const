// ==============================================================================
// POST /api/v1/auth/login
// ==============================================================================

import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { authService } from "@/server/modules/auth/auth.service";
import { LoginInputSchema } from "@/server/modules/auth/auth.types";

export const POST = createRouteHandler(
  async (req, { requestId }) => {
    const body = await req.json();
    const validated = LoginInputSchema.parse(body);

    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await authService.login(validated, { ipAddress, userAgent });

    if (result.mfaRequired) {
      return jsonOk({ mfaRequired: true }, undefined, undefined, requestId);
    }

    const response = jsonOk(
      {
        mfaRequired: false,
        user: result.user,
      },
      undefined,
      undefined,
      requestId
    );

    if (result.cookieConfig) {
      response.cookies.set({
        name: result.cookieConfig.name,
        value: result.cookieConfig.value,
        httpOnly: result.cookieConfig.httpOnly,
        secure: result.cookieConfig.secure,
        sameSite: result.cookieConfig.sameSite,
        path: result.cookieConfig.path,
        maxAge: result.cookieConfig.maxAge,
      });
    }

    return response;
  },
  { enableCsrf: false } // Public login endpoint
);
