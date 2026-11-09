// ==============================================================================
// POST /api/v1/users/invite
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { userService } from "@/server/modules/user/user.service";
import { InviteUserSchema } from "@/server/modules/user/user.types";

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = InviteUserSchema.parse(body);

  const result = await userService.inviteUser(ctx.companyId, validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
