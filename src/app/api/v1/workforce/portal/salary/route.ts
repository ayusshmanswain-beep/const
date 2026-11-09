// ==============================================================================
// GET /api/v1/workforce/portal/salary
// Self-Service Employee Compensation & Monthly Pay Breakdown
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const salary = await workforceService.getMySalary(ctx);
  return jsonOk(salary, undefined, undefined, requestId);
});
