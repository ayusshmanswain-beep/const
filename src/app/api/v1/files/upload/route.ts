// ==============================================================================
// POST /api/v1/files/upload
// Authorizes Document Upload & Emits Presigned Storage Ticket
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { fileService } from "@/server/modules/file/file.service";
import { InitiateUploadSchema } from "@/server/modules/file/file.types";

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = InitiateUploadSchema.parse(body);

  const result = await fileService.initiateUpload(ctx.companyId, validated, ctx);
  return jsonCreated(result, undefined, requestId);
});
