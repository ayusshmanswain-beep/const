// ==============================================================================
// POST /api/v1/projects/[id]/tasks
// Create WBS Tasks and Milestones
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const CreateTaskSchema = z.object({
  wbsNodeId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  title: z.string().min(2).max(250),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  isMilestone: z.boolean().optional(),
  milestoneTitle: z.string().optional(),
  plannedStartDate: z.string(), // ISO date
  plannedEndDate: z.string(), // ISO date
  assignedEmployeeIds: z.array(z.string().uuid()).optional(),
  assignedContractorId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  plannedManHours: z.number().nonnegative().optional(),
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateTaskSchema.parse(body);

  const task = await projectService.createTask(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(task, undefined, requestId);
});
