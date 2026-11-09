// ==============================================================================
// GET & POST /api/v1/projects/[id]/progress
// BOQ Construction Progress Activities Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const CreateProgressActivitySchema = z.object({
  taskId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  activityCode: z.string().min(2).max(50),
  activityName: z.string().min(2).max(250),
  trade: z.string().min(2).max(100),
  measurementUnit: z.enum(["CUM", "SQM", "MT", "RMT", "NOS", "LTR", "BAGS"]),
  plannedQuantity: z.number().positive(),
  ratePerUnit: z.number().positive().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const activities = await projectService.getProgressActivities(params.id, ctx);
  return jsonOk(activities, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateProgressActivitySchema.parse(body);

  const activity = await projectService.createProgressActivity(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(activity, undefined, requestId);
});
