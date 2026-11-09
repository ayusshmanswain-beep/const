// ==============================================================================
// GET & POST /api/v1/inventory/warehouses/[id]/locations
// Storage Bins, Racks, Bays and Staging Locations
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const CreateLocationSchema = z.object({
  locationCode: z.string().min(2).max(50),
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  zone: z.enum(["DRY_STORAGE", "OPEN_YARD", "HAZMAT", "COVERED_SHED", "ENCLOSED_RACK"]).optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const locations = await inventoryService.listStorageLocations(params.id, ctx);
  return jsonOk(locations, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateLocationSchema.parse(body);

  const loc = await inventoryService.createStorageLocation(
    {
      warehouseId: params.id,
      ...validated,
    },
    ctx
  );

  return jsonCreated(loc, undefined, requestId);
});
