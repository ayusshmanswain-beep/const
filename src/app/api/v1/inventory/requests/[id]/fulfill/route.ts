// ==============================================================================
// PATCH /api/v1/inventory/requests/[id]/fulfill
// Storekeeper Issue & Gate Pass Delivery Fulfillment
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const FulfillRequestSchema = z.object({
  deliveryChallanNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = FulfillRequestSchema.parse(body);

  const fulfilled = await inventoryService.fulfillMaterialRequest(
    {
      requestId: params.id,
      deliveryChallanNumber: validated.deliveryChallanNumber,
      notes: validated.notes,
    },
    ctx
  );

  return jsonOk(fulfilled, undefined, undefined, requestId);
});
