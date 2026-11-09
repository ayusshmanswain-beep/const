// ==============================================================================
// GET /api/v1/files/[id]/download
// Emits Authorized Temporary Pre-Signed File Retrieval URL
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
  const result = await fileService.getDownloadUrl(params.id, ctx.companyId, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
