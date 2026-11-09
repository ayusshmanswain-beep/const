// ==============================================================================
// GET & POST /api/v1/inventory/requests
// Site Material Indents & Requisitions Lifecycle
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const CreateRequestSchema = z.object({
  projectId: z.string().uuid(),
  siteId: z.string().uuid(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  dateRequired: z.string(), // ISO date
  targetSiteId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        requestedQuantity: z.number().positive(),
        unit: z.enum(["BAGS", "KG", "MT", "CUM", "CFT", "PCS", "LTR", "MTR", "SQFT", "SQM"]),
        remarks: z.string().optional(),
      })
    )
    .min(1),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;

  const requests = await inventoryService.listMaterialRequests(ctx, { projectId, status });
  return jsonOk(requests, undefined, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateRequestSchema.parse(body);

  const request = await inventoryService.createMaterialRequest(validated, ctx);
  return jsonCreated(request, undefined, requestId);
});
