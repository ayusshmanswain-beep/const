// ==============================================================================
// POST & PATCH /api/v1/workforce/employees/[id]/documents
// Employee Compliance Document Uploads & Verification Workflow
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { workforceService } from "@/server/modules/workforce/workforce.service";

const AddDocumentSchema = z.object({
  documentType: z.string().min(1),
  title: z.string().min(2).max(200),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
});

const VerifyDocumentSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = AddDocumentSchema.parse(body);

  const doc = await workforceService.addEmployeeDocument(
    params.id,
    {
      documentType: validated.documentType,
      title: validated.title,
      fileName: validated.fileName,
      fileUrl: validated.fileUrl,
    },
    ctx
  );

  return jsonCreated(doc, undefined, requestId);
});

export const PATCH = createRouteHandler<{ id: string }>(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = VerifyDocumentSchema.parse(body);

  const doc = await workforceService.verifyEmployeeDocument(
    validated.documentId,
    validated.status,
    validated.rejectionReason,
    ctx
  );

  return jsonOk(doc, undefined, undefined, requestId);
});
