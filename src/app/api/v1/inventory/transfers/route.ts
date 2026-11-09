// ==============================================================================
// GET & POST /api/v1/inventory/transfers
// Inter-Warehouse Stock Transfer Orders
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const InitiateTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  vehicleNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const transfers = await inventoryService.listStockTransfers(ctx);
  return jsonOk(transfers, undefined, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = InitiateTransferSchema.parse(body);

  const transfer = await inventoryService.initiateStockTransfer(validated, ctx);
  return jsonCreated(transfer, undefined, requestId);
});
