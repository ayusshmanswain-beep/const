// ==============================================================================
// GET & POST /api/v1/workforce/employees
// Comprehensive Employee Lifecycle Management
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20),
  departmentId: z.string().uuid().optional(),
  designationId: z.string().uuid().optional(),
  reportingManagerId: z.string().uuid().optional(),
  assignedProjectId: z.string().uuid().optional(),
  assignedSiteId: z.string().uuid().optional(),
  employmentType: z.enum(["PERMANENT", "TEMPORARY", "PROBATION", "CONTRACT"]),
  joiningDate: z.string(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  photoUrl: z.string().optional(),
  baseSalary: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  conveyanceAllowance: z.number().min(0).optional(),
  siteAllowance: z.number().min(0).optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const departmentId = req.nextUrl.searchParams.get("departmentId") || undefined;
  const designationId = req.nextUrl.searchParams.get("designationId") || undefined;
  const employmentType = req.nextUrl.searchParams.get("employmentType") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const siteId = req.nextUrl.searchParams.get("siteId") || req.nextUrl.searchParams.get("assignedSiteId") || undefined;

  const { data, meta } = await workforceService.listEmployees(ctx, {
    ...pagination,
    search,
    departmentId,
    designationId,
    employmentType,
    status,
    siteId,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateEmployeeSchema.parse(body);

  const employee = await workforceService.createEmployee(validated as any, ctx);
  return jsonCreated(employee, undefined, requestId);
});
