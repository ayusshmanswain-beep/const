// ==============================================================================
// GET & PATCH /api/v1/workforce/contractors/[id]
// Contractor Profile with Cumulative Billing & Payment History
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const UpdateContractorSchema = z.object({
  businessName: z.string().min(2).max(150).optional(),
  contactPerson: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).max(20).optional(),
  email: z.string().email().optional(),
  contractorType: z
    .enum([
      "LABOUR_SUPPLIER",
      "CIVIL_SUBCONTRACTOR",
      "ELECTRICAL_SUBCONTRACTOR",
      "PLUMBING_SUBCONTRACTOR",
      "HVAC_SUBCONTRACTOR",
      "STEEL_FABRICATION",
      "FORMWORK_SHUTTERING",
      "FINISHING_INTERIOR",
    ])
    .optional(),
  taxId: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  contractValidFrom: z.string().optional(),
  contractValidTo: z.string().optional(),
  contractRates: z.record(z.number().nonnegative()).optional(),
  allocatedProjectIds: z.array(z.string().uuid()).optional(),
  allocatedSiteIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const contractor = await workforceService.getContractor(params.id, ctx);
  return jsonOk(contractor, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateContractorSchema.parse(body);

  const updated = await workforceService.updateContractor(params.id, validated as any, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
