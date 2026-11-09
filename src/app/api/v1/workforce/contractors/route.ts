// ==============================================================================
// GET & POST /api/v1/workforce/contractors
// Labour Contractor & Subcontractor Directory
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const CreateContractorSchema = z.object({
  businessName: z.string().min(2).max(150),
  contractorType: z.enum([
    "LABOUR_SUPPLIER",
    "CIVIL_SUBCONTRACTOR",
    "ELECTRICAL_SUBCONTRACTOR",
    "PLUMBING_SUBCONTRACTOR",
    "HVAC_SUBCONTRACTOR",
    "STEEL_FABRICATION",
    "FORMWORK_SHUTTERING",
    "FINISHING_INTERIOR",
  ]),
  contactPerson: z.string().min(2).max(100),
  phone: z.string().min(5).max(20),
  email: z.string().email().optional(),
  taxId: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  contractValidFrom: z.string(),
  contractValidTo: z.string(),
  contractRates: z.record(z.number().nonnegative()).optional(),
  allocatedProjectIds: z.array(z.string().uuid()).optional(),
  allocatedSiteIds: z.array(z.string().uuid()).optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const contractorType = req.nextUrl.searchParams.get("contractorType") || undefined;
  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;

  const { data, meta } = await workforceService.listContractors(ctx, {
    ...pagination,
    search,
    contractorType,
    siteId,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateContractorSchema.parse(body);

  const contractor = await workforceService.createContractor(validated as any, ctx);
  return jsonCreated(contractor, undefined, requestId);
});
