// ==============================================================================
// GET /api/v1/audit-logs
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { auditService } from "@/server/modules/audit/audit.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const searchParams = req.nextUrl.searchParams;

  const filters = {
    ...pagination,
    tableName: searchParams.get("tableName") || undefined,
    action: searchParams.get("action") || undefined,
    actorUserId: searchParams.get("actorUserId") || undefined,
    startDate: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
    endDate: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
  };

  const { data, meta } = await auditService.queryLogs(ctx, filters);
  return jsonOk(data, meta, undefined, requestId);
});
