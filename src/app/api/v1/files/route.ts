// ==============================================================================
// GET /api/v1/files
// ==============================================================================

import { type z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { fileService } from "@/server/modules/file/file.service";
import { DocumentCategoryEnum } from "@/server/modules/file/file.types";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const searchParams = req.nextUrl.searchParams;

  const categoryParam = searchParams.get("category");
  const parsedCategory = categoryParam && DocumentCategoryEnum.safeParse(categoryParam).success
    ? (categoryParam as z.infer<typeof DocumentCategoryEnum>)
    : undefined;

  const filters = {
    ...pagination,
    category: parsedCategory,
    projectId: searchParams.get("projectId") || undefined,
    siteId: searchParams.get("siteId") || undefined,
  };

  const { data, meta } = await fileService.listDocuments(ctx.companyId, filters, ctx);
  return jsonOk(data, meta, undefined, requestId);
});
