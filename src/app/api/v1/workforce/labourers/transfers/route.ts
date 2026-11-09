// ==============================================================================
// POST /api/v1/workforce/labourers/transfers
// Labour Site & Project Transfer Workflow
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const TransferLabourerSchema = z.object({
  labourerId: z.string().uuid(),
  toSiteId: z.string().uuid(),
  reason: z.string().min(2),
  transferDate: z.string().default(new Date().toISOString().slice(0, 10)),
});

export const POST = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = TransferLabourerSchema.parse(body);

  const transfer = await workforceService.transferWorker(validated, ctx);
  return jsonCreated(transfer, undefined, requestId);
});
