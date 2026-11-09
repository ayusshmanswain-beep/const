// ==============================================================================
// GET & POST /api/v1/inventory/warehouses
// Multi-Tier Warehouse Directory & Setup (Central, Project, Site Store)
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const CreateWarehouseSchema = z.object({
  name: z.string().min(2).max(200),
  warehouseType: z.enum(["CENTRAL", "PROJECT", "SITE_STORE"]),
  address: z.string().min(5),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  managerUserId: z.string().uuid().optional(),
  contactPhone: z.string().optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const warehouses = await inventoryService.listWarehouses(ctx);
  return jsonOk(warehouses, undefined, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateWarehouseSchema.parse(body);

  const warehouse = await inventoryService.createWarehouse(validated, ctx);
  return jsonCreated(warehouse, undefined, requestId);
});
