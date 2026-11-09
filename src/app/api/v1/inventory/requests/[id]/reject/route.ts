// ==============================================================================
// PATCH /api/v1/inventory/requests/[id]/reject
// Reject Site Material Requisition
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const RejectRequestSchema = z.object({
  rejectionReason: z.string().min(3).max(250),
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = RejectRequestSchema.parse(body);

  const rejected = await inventoryService.rejectMaterialRequest(
    {
      requestId: params.id,
      rejectionReason: validated.rejectionReason,
    },
    ctx
  );

  return jsonOk(rejected, undefined, undefined, requestId);
});
