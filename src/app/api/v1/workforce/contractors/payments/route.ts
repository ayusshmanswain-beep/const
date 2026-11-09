// ==============================================================================
// POST /api/v1/workforce/contractors/payments
// Contractor Payment Disbursal & Retention Settlement
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const RecordPaymentSchema = z.object({
  billId: z.string().uuid(),
  amount: z.number().positive(),
  paymentDate: z.string().default(new Date().toISOString().slice(0, 10)),
  paymentMode: z.enum(["BANK_TRANSFER", "CHEQUE", "UPI", "CASH"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = RecordPaymentSchema.parse(body);

  const payment = await workforceService.recordContractorPayment(validated, ctx);
  return jsonCreated(payment, undefined, requestId);
});
