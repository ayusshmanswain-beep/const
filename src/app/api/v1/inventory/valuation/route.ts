// ==============================================================================
// GET /api/v1/inventory/valuation
// Real-Time Total Inventory Valuation & Category Breakdown
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const valuation = await inventoryService.getInventoryValuation(ctx);
  return jsonOk(valuation, undefined, undefined, requestId);
});
