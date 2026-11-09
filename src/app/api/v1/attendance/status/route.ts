// ==============================================================================
// GET /api/v1/attendance/status
// Current Employee Punch Status, Assigned Sites & Active Shift
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { attendanceService } from "@/server/modules/attendance/attendance.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const status = await attendanceService.getAttendanceStatus(ctx);
  return jsonOk(status, undefined, undefined, requestId);
});
