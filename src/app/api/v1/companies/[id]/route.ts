// ==============================================================================
// GET & PATCH /api/v1/companies/[id]
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { companyService } from "@/server/modules/company/company.service";
import { UpdateCompanySchema } from "@/server/modules/company/company.types";

interface RouteParams {
  id: string;
}

export const GET = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const company = await companyService.getCompany(params.id, ctx);
  return jsonOk(company, undefined, undefined, requestId);
});

export const PATCH = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = UpdateCompanySchema.parse(body);

  const updated = await companyService.updateCompany(params.id, validated, ctx);
  return jsonOk(updated, undefined, undefined, requestId);
});
