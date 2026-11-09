// ==============================================================================
// GET /api/v1/inventory/ledger
// Immutable Historical Stock Transaction Ledger
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const materialId = req.nextUrl.searchParams.get("materialId") || undefined;
  const warehouseId = req.nextUrl.searchParams.get("warehouseId") || undefined;
  const transactionType = req.nextUrl.searchParams.get("transactionType") || undefined;
  const limit = req.nextUrl.searchParams.get("limit") ? Number(req.nextUrl.searchParams.get("limit")) : 100;

  const ledger = await inventoryService.getStockLedger(ctx, {
    materialId,
    warehouseId,
    transactionType,
    limit,
  });

  return jsonOk(ledger, undefined, undefined, requestId);
});
