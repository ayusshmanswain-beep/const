// ==============================================================================
// GET & PATCH /api/v1/inventory/materials/[id]
// Material Details, Stock Dossier & Updates
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const UpdateMaterialSchema = z.object({
  name: z.string().min(2).max(250).optional(),
  category: z
    .enum([
      "CEMENT",
      "STEEL_REBAR",
      "AGGREGATES_SAND",
      "BRICKS_BLOCKS",
      "ELECTRICAL",
      "PLUMBING_PIPES",
      "FINISHING_PAINT",
      "TIMBER_FORMWORK",
      "CHEMICALS_ADMIXTURES",
      "SAFETY_PPE",
      "OTHER",
    ])
    .optional(),
  unitOfMeasurement: z
    .enum(["BAGS", "KG", "MT", "CUM", "CFT", "PCS", "LTR", "MTR", "SQFT", "SQM"])
    .optional(),
  brand: z.string().optional(),
  specification: z.string().optional(),
  standardRate: z.number().nonnegative().optional(),
  preferredSupplier: z.string().optional(),
  minimumStock: z.number().nonnegative().optional(),
  maximumStock: z.number().positive().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  hsnCode: z.string().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  barcode: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const dossier = await inventoryService.getMaterial(params.id, ctx);
  return jsonOk(dossier, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateMaterialSchema.parse(body);

  const updated = await inventoryService.updateMaterial(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
