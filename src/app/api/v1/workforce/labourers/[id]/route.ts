// ==============================================================================
// GET & PATCH /api/v1/workforce/labourers/[id]
// Labourer Profile & Details Update
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const UpdateLabourerSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  contractorId: z.string().uuid().nullable().optional(),
  skillLevel: z.enum(["UNSKILLED", "SEMI_SKILLED", "SKILLED", "HIGHLY_SKILLED"]).optional(),
  primaryTrade: z
    .enum([
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
    ])
    .optional(),
  dailyWageRate: z.number().nonnegative().optional(),
  hourlyWageRate: z.number().nonnegative().optional(),
  pieceRateWage: z.number().nonnegative().optional(),
  groupName: z.string().nullable().optional(),
  currentProjectId: z.string().uuid().nullable().optional(),
  currentSiteId: z.string().uuid().nullable().optional(),
  emergencyPhone: z.string().optional(),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  photoUrl: z.string().optional(),
  availabilityStatus: z.enum(["AVAILABLE", "ON_SITE", "ON_LEAVE", "INACTIVE"]).optional(),
  isActive: z.boolean().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const labourer = await workforceService.getLabourer(params.id, ctx);
  return jsonOk(labourer, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateLabourerSchema.parse(body);

  const updated = await workforceService.updateLabourer(params.id, validated as any, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
