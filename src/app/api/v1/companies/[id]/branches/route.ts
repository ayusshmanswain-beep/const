// ==============================================================================
// GET & POST /api/v1/companies/[id]/branches
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { companyService } from "@/server/modules/company/company.service";
import { CreateBranchSchema } from "@/server/modules/company/company.types";

interface RouteParams {
  id: string;
}

export const GET = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const branches = await companyService.listBranches(params.id, ctx);
  return jsonOk(branches, undefined, undefined, requestId);
});

export const POST = createRouteHandler<RouteParams>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateBranchSchema.parse(body);

  const branch = await companyService.createBranch(params.id, validated, ctx);
  return jsonCreated(branch, undefined, requestId);
});
