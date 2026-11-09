// ==============================================================================
// PATCH /api/v1/inventory/requests/[id]/approve
// Project Manager Sign-Off & Warehouse Assignment
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const ApproveRequestSchema = z.object({
  sourceWarehouseId: z.string().uuid(),
  notes: z.string().optional(),
  approvedItems: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        approvedQuantity: z.number().positive(),
      })
    )
    .optional(),
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ApproveRequestSchema.parse(body);

  const approved = await inventoryService.approveMaterialRequest(
    {
      requestId: params.id,
      ...validated,
    },
    ctx
  );

  return jsonOk(approved, undefined, undefined, requestId);
});
