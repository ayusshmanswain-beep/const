// ==============================================================================
// GET & POST /api/v1/workforce/labourers
// Daily-Wage Labourers & Gangs Registry
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const CreateLabourerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  contractorId: z.string().uuid().optional(),
  skillLevel: z.enum(["UNSKILLED", "SEMI_SKILLED", "SKILLED", "HIGHLY_SKILLED"]),
  primaryTrade: z.enum([
    "MASON",
    "CARPENTER",
    "BAR_BENDER",
    "ELECTRICIAN",
    "PLUMBER",
    "WELDER",
    "PAINTER",
    "SCAFFOLDER",
    "HEAVY_EQUIPMENT_OPERATOR",
    "SURVEY_ASSISTANT",
    "GENERAL_HELPER",
    "RIGGER",
  ]),
  dailyWageRate: z.number().nonnegative(),
  hourlyWageRate: z.number().nonnegative().optional(),
  pieceRateWage: z.number().nonnegative().optional(),
  groupName: z.string().optional(),
  currentProjectId: z.string().uuid().optional(),
  currentSiteId: z.string().uuid().optional(),
  emergencyPhone: z.string().optional(),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const trade = req.nextUrl.searchParams.get("trade") || undefined;
  const skillLevel = req.nextUrl.searchParams.get("skillLevel") || req.nextUrl.searchParams.get("category") || undefined;
  const contractorId = req.nextUrl.searchParams.get("contractorId") || undefined;
  const siteId = req.nextUrl.searchParams.get("siteId") || req.nextUrl.searchParams.get("assignedSiteId") || undefined;
  const availabilityStatus = req.nextUrl.searchParams.get("availabilityStatus") || undefined;

  const { data, meta } = await workforceService.listLabourers(ctx, {
    ...pagination,
    search,
    trade,
    skillLevel,
    contractorId,
    siteId,
    availabilityStatus,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateLabourerSchema.parse(body);

  const labourer = await workforceService.createLabourer(validated as any, ctx);
  return jsonCreated(labourer, undefined, requestId);
});
