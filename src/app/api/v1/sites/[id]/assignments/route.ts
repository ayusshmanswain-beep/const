// ==============================================================================
// GET & POST /api/v1/sites/[id]/assignments
// Personnel & Labour Force Site Assignment Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { db } from "@/server/db/client";
import { siteService } from "@/server/modules/site/site.service";

const AssignWorkerSchema = z.object({
  assigneeType: z.enum(["EMPLOYEE", "LABOURER", "CONTRACTOR"]),
  employeeId: z.string().uuid().optional(),
  labourerId: z.string().uuid().optional(),
  roleOnSite: z.string().max(100).optional(),
  assignedFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const assignments = await siteService.getAssignments(params.id, ctx);
  const store = db.getStore();

  const enriched = assignments.map((a) => {
    let name = "Unknown";
    let code = "";
    if (a.assigneeType === "EMPLOYEE" && a.employeeId) {
      const emp = store.employees.get(a.employeeId);
      if (emp) {
        name = `${emp.firstName} ${emp.lastName}`;
        code = emp.employeeCode;
      }
    } else if (a.assigneeType === "LABOURER" && a.labourerId) {
      const lab = store.labourers.get(a.labourerId);
      if (lab) {
        name = `${lab.firstName} ${lab.lastName}`;
        code = lab.labourerCode;
      }
    }
    return {
      ...a,
      workerName: name,
      workerCode: code,
    };
  });

  return jsonOk(enriched, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = AssignWorkerSchema.parse(body);

  const assignment = await siteService.assignWorker(params.id, validated, ctx);
  return jsonCreated(assignment, undefined, requestId);
});

export const DELETE = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) {
    throw new Error("Missing assignmentId query parameter");
  }

  await siteService.removeAssignment(params.id, assignmentId, ctx);
  return jsonOk({ success: true, message: "Assignment deactivated" }, undefined, undefined, requestId);
});
