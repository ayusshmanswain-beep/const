// ==============================================================================
// POST & PATCH /api/v1/workforce/labourers/advances
// Labour Wage Advance Requests & Approval Workflow
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const RequestAdvanceSchema = z.object({
  labourerId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(2),
});

const ReviewAdvanceSchema = z.object({
  advanceId: z.string().uuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = RequestAdvanceSchema.parse(body);

  const advance = await workforceService.requestAdvance(validated, ctx);
  return jsonCreated(advance, undefined, requestId);
});

export const PATCH = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ReviewAdvanceSchema.parse(body);

  const updated = await workforceService.reviewAdvance(
    {
      advanceId: validated.advanceId,
      decision: validated.status,
    },
    ctx
  );

  return jsonOk(updated, undefined, undefined, requestId);
});
