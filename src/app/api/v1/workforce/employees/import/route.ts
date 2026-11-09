// ==============================================================================
// POST /api/v1/workforce/employees/import
// Bulk Employee Import via CSV
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const ImportSchema = z.object({
  csvContent: z.string().min(10),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = ImportSchema.parse(body);

  const result = await workforceService.bulkImportEmployees(validated.csvContent, ctx);
  return jsonOk(result, undefined, undefined, requestId);
});
