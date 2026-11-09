// ==============================================================================
// POST /api/v1/inventory/operations/issue
// Material Issuance to Site, Gang or Subcontractor
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const IssueSchema = z.object({
  warehouseId: z.string().uuid(),
  storageLocationId: z.string().uuid().optional(),
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  projectId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  issuedToPersonName: z.string().min(2).max(150),
  materialRequestId: z.string().uuid().optional(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = IssueSchema.parse(body);

  const result = await inventoryService.issueMaterialToSite(validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
