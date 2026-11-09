// ==============================================================================
// GET /api/v1/workforce/dashboard
// Workforce Executive KPI Metrics & Breakdown
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const summary = await workforceService.getDashboardSummary(ctx);
  return jsonOk(summary, undefined, undefined, requestId);
});
