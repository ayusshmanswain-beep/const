// ==============================================================================
// POST /api/v1/attendance/check-in
// Explicit Employee Geofence Check-in with WGS-84 Distance Verification
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { attendanceService } from "@/server/modules/attendance/attendance.service";

const CheckInSchema = z.object({
  siteId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().min(0).max(1000),
  isMockLocation: z.boolean().optional(),
  photoUrl: z.string().optional(),
  qrCodeHash: z.string().optional(),
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  appVersion: z.string().optional(),
  idempotencyKey: z.string().min(8),
  workerType: z.enum(["EMPLOYEE", "LABOURER"]).optional(),
  workerId: z.string().uuid().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CheckInSchema.parse(body);

  const result = await attendanceService.processCheckIn(validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
