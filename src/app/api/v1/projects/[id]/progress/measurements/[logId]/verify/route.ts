// ==============================================================================
// PATCH /api/v1/projects/[id]/progress/measurements/[logId]/verify
// Site Engineer & PM Field Measurement Verification Sign-Off
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const VerifyMeasurementSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED", "DISCREPANCY"]),
  notes: z.string().optional(),
});

export const PATCH = createRouteHandler<{ id: string; logId: string }>(
  async (req, { params, requestId }) => {
    const ctx = await resolveSecurityContext(req);
    const body = await req.json();
    const validated = VerifyMeasurementSchema.parse(body);

    const verified = await projectService.verifyProgressMeasurement(
      {
        logId: params.logId,
        status: validated.status,
        notes: validated.notes,
      },
      ctx
    );

    return jsonOk(verified, undefined, undefined, requestId);
  }
);
