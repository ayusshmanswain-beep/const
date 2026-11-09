// ==============================================================================
// GET /api/v1/auth/me
// Returns Authenticated User Profile, Active Tenant & Effective RBAC Claims
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);

  return jsonOk(
    {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        fullName: ctx.user.fullName,
        phoneNumber: ctx.user.phoneNumber,
        avatarUrl: ctx.user.avatarUrl,
        mfaEnabled: ctx.user.mfaEnabled,
      },
      companyId: ctx.companyId,
      isSuperAdmin: ctx.isSuperAdmin,
      roles: ctx.roles,
      permissions: Array.from(ctx.permissions),
    },
    undefined,
    undefined,
    requestId
  );
});
