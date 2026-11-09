// ==============================================================================
// PATCH /api/v1/projects/[id]/delays/[delayId]/resolve
// Mark Construction Delay Record Resolved
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const ResolveDelaySchema = z.object({
  mitigationNotes: z.string().optional(),
});

export const PATCH = createRouteHandler<{ id: string; delayId: string }>(
  async (req, { params, requestId }) => {
    const ctx = await resolveSecurityContext(req);
    const body = await req.json();
    const validated = ResolveDelaySchema.parse(body);

    const resolved = await projectService.resolveDelay(
      {
        delayId: params.delayId,
        mitigationNotes: validated.mitigationNotes,
      },
      ctx
    );

    return jsonOk(resolved, undefined, undefined, requestId);
  }
);
