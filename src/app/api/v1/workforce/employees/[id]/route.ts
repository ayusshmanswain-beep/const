// ==============================================================================
// GET & PATCH /api/v1/workforce/employees/[id]
// Full Employee Profile & Lifecycle Updates
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const UpdateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(5).max(20).optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  employmentType: z.enum(["PERMANENT", "TEMPORARY", "PROBATION", "CONTRACT"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED"]).optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  assignedProjectId: z.string().uuid().nullable().optional(),
  assignedSiteId: z.string().uuid().nullable().optional(),
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankName: z.string().optional(),
  avatarUrl: z.string().optional(),
  changeReason: z.string().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const employee = await workforceService.getEmployee(params.id, ctx);
  return jsonOk(employee, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateEmployeeSchema.parse(body);

  const updated = await workforceService.updateEmployee(params.id, validated as any, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
