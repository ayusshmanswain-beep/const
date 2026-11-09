// ==============================================================================
// GET /api/v1/companies
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { companyService } from "@/server/modules/company/company.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);

  const { data, meta } = await companyService.listCompanies(ctx, pagination);
  return jsonOk(data, meta, undefined, requestId);
});
