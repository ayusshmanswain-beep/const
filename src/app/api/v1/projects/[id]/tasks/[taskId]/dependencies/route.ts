// ==============================================================================
// POST /api/v1/projects/[id]/tasks/[taskId]/dependencies
// Link Task Dependencies with Cycle Prevention
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const AddDependencySchema = z.object({
  predecessorTaskId: z.string().uuid(),
  dependencyType: z
    .enum(["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH", "START_TO_FINISH"])
    .optional(),
  lagDays: z.number().int().optional(),
});

export const POST = createRouteHandler<{ id: string; taskId: string }>(
  async (req, { params, requestId }) => {
    const ctx = await resolveSecurityContext(req);
    const body = await req.json();
    const validated = AddDependencySchema.parse(body);

    const dep = await projectService.addTaskDependency(
      {
        projectId: params.id,
        taskId: params.taskId,
        predecessorTaskId: validated.predecessorTaskId,
        dependencyType: validated.dependencyType,
        lagDays: validated.lagDays,
      },
      ctx
    );

    return jsonCreated(dep, undefined, requestId);
  }
);
