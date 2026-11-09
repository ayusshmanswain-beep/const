// ==============================================================================
// GET & POST /api/v1/projects/[id]/progress/measurements
// Log & Review Daily Field Progress Measurements
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const LogProgressMeasurementSchema = z.object({
  activityId: z.string().uuid(),
  measurementDate: z.string().optional(),
  quantityRecorded: z.number().positive(),
  locationDescription: z.string().min(2).max(250),
  sitePhotoUrls: z.array(z.string().url().or(z.string().min(1))).optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const activityId = req.nextUrl.searchParams.get("activityId") || undefined;
  const logs = await projectService.getMeasurementLogs(params.id, ctx, activityId);
  return jsonOk(logs, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = LogProgressMeasurementSchema.parse(body);

  const log = await projectService.logProgressMeasurement(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(log, undefined, requestId);
});
