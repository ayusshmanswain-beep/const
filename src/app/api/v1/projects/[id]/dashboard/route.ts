// ==============================================================================
// GET /api/v1/projects/[id]/dashboard
// Executive Project Command Dashboard Analytics
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const dashboard = await projectService.getProjectDashboard(params.id, ctx);
  return jsonOk(dashboard, undefined, undefined, requestId);
});
