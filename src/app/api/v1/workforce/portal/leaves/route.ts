// ==============================================================================
// GET & POST /api/v1/workforce/portal/leaves
// Self-Service Leave Balances, Application Submission & History
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const ApplyLeaveSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().min(4),
  endDate: z.string().min(4),
  reason: z.string().min(2),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const data = await workforceService.getMyLeaves(ctx);
  return jsonOk(data, undefined, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ApplyLeaveSchema.parse(body);

  const request = await workforceService.applyLeave(
    {
      leaveTypeId: validated.leaveTypeId,
      startDate: validated.startDate,
      endDate: validated.endDate,
      reason: validated.reason,
    },
    ctx
  );

  return jsonCreated(request, undefined, requestId);
});
