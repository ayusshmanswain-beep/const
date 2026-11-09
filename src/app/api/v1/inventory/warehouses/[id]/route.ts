// ==============================================================================
// PATCH /api/v1/inventory/warehouses/[id]
// Update Warehouse Operational Details & Manager Assignment
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const UpdateWarehouseSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  warehouseType: z.enum(["CENTRAL", "PROJECT", "SITE_STORE"]).optional(),
  address: z.string().min(5).optional(),
  managerUserId: z.string().uuid().optional(),
  contactPhone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateWarehouseSchema.parse(body);

  const updated = await inventoryService.updateWarehouse(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
