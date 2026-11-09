// ==============================================================================
// POST /api/v1/attendance/check-out
// Explicit Employee Geofence Check-out with Duration & Overtime Rollup
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { attendanceService } from "@/server/modules/attendance/attendance.service";

const CheckOutSchema = z.object({
  sessionId: z.string().uuid().optional(),
  siteId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().min(0).max(1000),
  isMockLocation: z.boolean().optional(),
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  appVersion: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CheckOutSchema.parse(body);

  const result = await attendanceService.processCheckOut(validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
