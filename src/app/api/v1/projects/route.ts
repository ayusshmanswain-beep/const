// ==============================================================================
// GET & POST /api/v1/projects
// Multi-Tenant Construction Project Portfolio Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { projectService } from "@/server/modules/project/project.service";

const CreateProjectSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  clientName: z.string().min(2).max(150),
  clientContactPerson: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  projectManagerId: z.string().uuid().optional(),
  contractValue: z.number().nonnegative(),
  budget: z.number().positive(),
  startDate: z.string(), // YYYY-MM-DD
  plannedEndDate: z.string(), // YYYY-MM-DD
  assignedSiteIds: z.array(z.string().uuid()).optional(),
  assignedEmployeeIds: z.array(z.string().uuid()).optional(),
  assignedLabourerIds: z.array(z.string().uuid()).optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const healthStatus = req.nextUrl.searchParams.get("healthStatus") || undefined;
  const projectManagerId = req.nextUrl.searchParams.get("projectManagerId") || undefined;
  const sortBy = (req.nextUrl.searchParams.get("sortBy") as any) || undefined;
  const sortOrder = (req.nextUrl.searchParams.get("sortOrder") as any) || undefined;

  const { data, meta } = await projectService.listProjects(ctx, {
    ...pagination,
    search,
    status,
    healthStatus,
    projectManagerId,
    sortBy,
    sortOrder,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateProjectSchema.parse(body);

  const project = await projectService.createProject(validated, ctx);
  return jsonCreated(project, undefined, requestId);
});
