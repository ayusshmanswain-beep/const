// ==============================================================================
// POST /api/v1/inventory/operations/reconcile
// Physical Audit Stock Reconciliation & Adjustments
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const ReconcileSchema = z.object({
  warehouseId: z.string().uuid(),
  storageLocationId: z.string().uuid().optional(),
  materialId: z.string().uuid(),
  actualPhysicalQuantity: z.number().nonnegative(),
  adjustmentReason: z.string().min(3).max(250),
  remarks: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ReconcileSchema.parse(body);

  const result = await inventoryService.reconcileStockAdjustment(validated, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
