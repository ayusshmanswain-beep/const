// ==============================================================================
// GET & POST /api/v1/inventory/materials
// Material Master Catalogue & On-Hand Balance Queries
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { inventoryService } from "@/server/modules/inventory/inventory.service";

const CreateMaterialSchema = z.object({
  name: z.string().min(2).max(250),
  category: z.enum([
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
  ]),
  unitOfMeasurement: z.enum([
    "BAGS",
    "KG",
    "MT",
    "CUM",
    "CFT",
    "PCS",
    "LTR",
    "MTR",
    "SQFT",
    "SQM",
  ]),
  brand: z.string().optional(),
  specification: z.string().optional(),
  standardRate: z.number().nonnegative(),
  preferredSupplier: z.string().optional(),
  minimumStock: z.number().nonnegative(),
  maximumStock: z.number().positive(),
  reorderLevel: z.number().nonnegative().optional(),
  hsnCode: z.string().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  barcode: z.string().optional(),
});

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const search = req.nextUrl.searchParams.get("search") || undefined;
  const category = (req.nextUrl.searchParams.get("category") as any) || undefined;
  const status = (req.nextUrl.searchParams.get("status") as any) || undefined;
  const lowStockOnly = req.nextUrl.searchParams.get("lowStock") === "true";

  const { data, meta } = await inventoryService.listMaterials(ctx, {
    ...pagination,
    search,
    category,
    status,
    lowStockOnly,
  });

  return jsonOk(data, meta, undefined, requestId);
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateMaterialSchema.parse(body);

  const material = await inventoryService.createMaterial(validated, ctx);
  return jsonCreated(material, undefined, requestId);
});
