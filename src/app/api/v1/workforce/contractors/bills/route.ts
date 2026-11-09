// ==============================================================================
// POST & PATCH /api/v1/workforce/contractors/bills
// Contractor Periodic RA Bills & Approval Workflow
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const SubmitBillSchema = z.object({
  contractorId: z.string().uuid(),
  billNumber: z.string().min(2),
  periodStartDate: z.string(),
  periodEndDate: z.string(),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  mandaysCount: z.number().int().nonnegative().default(0),
  grossAmount: z.number().positive(),
  deductionsAmount: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

const ReviewBillSchema = z.object({
  billId: z.string().uuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = SubmitBillSchema.parse(body);

  const bill = await workforceService.submitContractorBill(
    {
      contractorId: validated.contractorId,
      billNumber: validated.billNumber,
      periodStartDate: validated.periodStartDate,
      periodEndDate: validated.periodEndDate,
      projectId: validated.projectId,
      siteId: validated.siteId,
      mandaysCount: validated.mandaysCount,
      grossAmount: validated.grossAmount,
      deductionsAmount: validated.deductionsAmount,
      notes: validated.notes,
    },
    ctx
  );

  return jsonCreated(bill, undefined, requestId);
});

export const PATCH = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ReviewBillSchema.parse(body);

  const updated = await workforceService.reviewContractorBill(
    {
      billId: validated.billId,
      decision: validated.status,
      notes: validated.notes,
    },
    ctx
  );

  return jsonOk(updated, undefined, undefined, requestId);
});
