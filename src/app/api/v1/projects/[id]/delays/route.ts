// ==============================================================================
// GET & POST /api/v1/projects/[id]/delays
// Construction Delay Tracking, Impact Assessment & Mitigation
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const ReportDelaySchema = z.object({
  taskId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  delayReasonCategory: z.enum([
    "WEATHER_MONSOON",
    "MATERIAL_SHORTAGE",
    "LABOUR_SHORTAGE",
    "CLIENT_DRAWING_REVISION",
    "PERMIT_DELAY",
    "EQUIPMENT_BREAKDOWN",
    "FINANCIAL",
    "SITE_ACCIDENT",
  ]),
  delayDaysImpact: z.number().int().positive(),
  title: z.string().min(2).max(200),
  description: z.string().min(5),
  mitigationAction: z.string().min(5),
  isCriticalPathImpact: z.boolean().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const delays = await projectService.getDelayRecords(params.id, ctx);
  return jsonOk(delays, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ReportDelaySchema.parse(body);

  const delay = await projectService.reportDelay(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(delay, undefined, requestId);
});
