// ==============================================================================
// GET /api/v1/files/[id]
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { fileService } from "@/server/modules/file/file.service";

interface RouteParams {
  id: string;
}

export const GET = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const doc = await fileService.getDocument(params.id, ctx.companyId, ctx);
  return jsonOk(doc, undefined, undefined, requestId);
});
