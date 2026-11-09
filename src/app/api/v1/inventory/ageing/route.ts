// ==============================================================================
// GET /api/v1/inventory/ageing
// Stock Ageing Analysis (0-30, 31-60, 61-90, >90 Days & Perishable Alerts)
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const report = await inventoryService.getStockAgeingReport(ctx);
  return jsonOk(report, undefined, undefined, requestId);
});
