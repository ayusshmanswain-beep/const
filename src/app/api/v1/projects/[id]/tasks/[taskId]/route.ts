// ==============================================================================
// PATCH /api/v1/projects/[id]/tasks/[taskId]
// Update Task Status, Progress, and Assignments
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const UpdateTaskSchema = z.object({
  title: z.string().min(2).max(250).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"]).optional(),
  completionPercent: z.number().min(0).max(100).optional(),
  isMilestone: z.boolean().optional(),
  milestoneTitle: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  assignedEmployeeIds: z.array(z.string().uuid()).optional(),
  assignedContractorId: z.string().uuid().nullable().optional(),
  siteId: z.string().uuid().nullable().optional(),
  actualManHours: z.number().nonnegative().optional(),
});

export const PATCH = createRouteHandler<{ id: string; taskId: string }>(
  async (req, { params, requestId }) => {
    const ctx = await resolveSecurityContext(req);
    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);

    const updated = await projectService.updateTask(params.taskId, validated as any, ctx);
    return jsonOk(updated, undefined, undefined, requestId);
  }
);
