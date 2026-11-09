// ==============================================================================
// POST /api/v1/inventory/operations/grn
// Goods Receipt Note (Inward Material Inflow & Ledger Booking)
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const GrnSchema = z.object({
  warehouseId: z.string().uuid(),
  storageLocationId: z.string().uuid().optional(),
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  supplierName: z.string().min(2).max(150),
  purchaseOrderRef: z.string().optional(),
  grnNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = GrnSchema.parse(body);

  const result = await inventoryService.recordGoodsReceiptNote(validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
