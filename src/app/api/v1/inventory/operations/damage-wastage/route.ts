// ==============================================================================
// POST /api/v1/inventory/operations/damage-wastage
// Damaged Material Quarantine & Execution Wastage Scrap Write-Off
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const DamageWastageSchema = z.object({
  warehouseId: z.string().uuid(),
  storageLocationId: z.string().uuid().optional(),
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  isDamage: z.boolean(),
  rootCause: z.string().min(3).max(250),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = DamageWastageSchema.parse(body);

  const result = await inventoryService.recordWastageOrDamage(validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
