// ==============================================================================
// POST /api/v1/attendance/exceptions
// Supervisor Review & Approval Action on Flagged Attendance
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { attendanceService } from "@/server/modules/attendance/attendance.service";

const ExceptionReviewSchema = z.object({
  sessionId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().max(500).optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ExceptionReviewSchema.parse(body);

  const result = await attendanceService.reviewException(validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
