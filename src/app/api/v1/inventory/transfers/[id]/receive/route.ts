// ==============================================================================
// PATCH /api/v1/inventory/transfers/[id]/receive
// Acknowledge Receipt of Inward Inter-Warehouse Transfer
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const ReceiveTransferSchema = z.object({
  destinationLocationId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ReceiveTransferSchema.parse(body);

  const updated = await inventoryService.receiveStockTransfer(
    {
      transferId: params.id,
      ...validated,
    },
    ctx
  );

  return jsonOk(updated, undefined, undefined, requestId);
});
