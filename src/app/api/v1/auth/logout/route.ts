// ==============================================================================
// POST /api/v1/auth/logout
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { authService } from "@/server/modules/auth/auth.service";

export const POST = createRouteHandler(
  async (req, { requestId }) => {
    let sessionId: string | undefined;
    let userId: string | undefined;
    let companyId: string | undefined;

    try {
      const ctx = await resolveSecurityContext(req);
      sessionId = ctx.session.id;
      userId = ctx.user.id;
      companyId = ctx.companyId;
    } catch {
      // Best effort on logout
    }

    const { cookieConfig } = await authService.logout(sessionId || "", userId, companyId);

    const response = jsonOk({ loggedOut: true }, undefined, undefined, requestId);

    response.cookies.set({
      name: cookieConfig.name,
      value: "",
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: "/",
      maxAge: 0,
    });

    return response;
  },
  { enableCsrf: false }
);
