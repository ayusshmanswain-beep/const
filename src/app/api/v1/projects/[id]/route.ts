// ==============================================================================
// GET & PATCH /api/v1/projects/[id]
// Full Project Details & Lifecycle Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  clientName: z.string().min(2).max(150).optional(),
  clientContactPerson: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  projectManagerId: z.string().uuid().optional(),
  contractValue: z.number().nonnegative().optional(),
  budget: z.number().positive().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  healthStatus: z.enum(["ON_TRACK", "AT_RISK", "DELAYED"]).optional(),
  plannedEndDate: z.string().optional(),
  actualStartDate: z.string().optional(),
  actualEndDate: z.string().optional(),
  assignedSiteIds: z.array(z.string().uuid()).optional(),
  assignedEmployeeIds: z.array(z.string().uuid()).optional(),
  assignedLabourerIds: z.array(z.string().uuid()).optional(),
  overallProgressPercent: z.number().min(0).max(100).optional(),
  reason: z.string().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const detail = await projectService.getProject(params.id, ctx);
  return jsonOk(detail, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateProjectSchema.parse(body);

  const updated = await projectService.updateProject(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
