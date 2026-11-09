// ==============================================================================
// GET /api/v1/workforce/labourers/[id]/wage
// Authoritative Daily/Overtime/Piece-rate Wage Calculation with Advances
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const daysWorked = Number(req.nextUrl.searchParams.get("daysWorked") || 0);
  const overtimeHours = Number(req.nextUrl.searchParams.get("overtimeHours") || 0);
  const piecesCompleted = Number(req.nextUrl.searchParams.get("piecesCompleted") || 0);

  const wage = await workforceService.calculateWage(
    params.id,
    daysWorked,
    overtimeHours,
    piecesCompleted,
    ctx
  );

  return jsonOk(wage, undefined, undefined, requestId);
});
