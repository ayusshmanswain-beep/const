// ==============================================================================
// GET & POST /api/v1/projects/[id]/financials
// Project Budget Variance & Real-Time Expense Ledger
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const RecordExpenseSchema = z.object({
  costCategory: z.enum(["LABOUR", "MATERIAL", "EQUIPMENT", "CONTRACTOR", "PERMITS_OVERHEAD"]),
  title: z.string().min(2).max(200),
  amount: z.number().positive(),
  date: z.string().optional(),
  referenceType: z
    .enum(["CONTRACTOR_BILL", "LABOUR_PAYROLL", "MATERIAL_PO", "EQUIPMENT_RENTAL", "DIRECT_VOUCHER"])
    .optional(),
  referenceId: z.string().optional(),
  vendorOrBeneficiary: z.string().min(2).max(150),
  notes: z.string().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const financials = await projectService.getProjectFinancials(params.id, ctx);
  return jsonOk(financials, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = RecordExpenseSchema.parse(body);

  const expense = await projectService.recordProjectExpense(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(expense, undefined, requestId);
});
