// ==============================================================================
// GET /api/v1/inventory/dashboard
// Executive Inventory & Warehouse Analytics Dashboard
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const dashboard = await inventoryService.getInventoryDashboard(ctx);
  return jsonOk(dashboard, undefined, undefined, requestId);
});
