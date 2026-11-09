// ==============================================================================
// GET & POST /api/v1/projects/[id]/documents
// Project Blueprint, Specification & Contract Document Storage
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const AttachDocumentSchema = z.object({
  documentType: z.enum([
    "CONTRACT",
    "ARCHITECTURAL_DRAWING",
    "STRUCTURAL_DESIGN",
    "BOQ",
    "SITE_PERMIT",
    "SAFETY_PLAN",
    "PROGRESS_REPORT",
    "OTHER",
  ]),
  title: z.string().min(2).max(200),
  fileName: z.string().min(2).max(250),
  fileUrl: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  version: z.string().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const docs = await projectService.getProjectDocuments(params.id, ctx);
  return jsonOk(docs, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = AttachDocumentSchema.parse(body);

  const doc = await projectService.attachProjectDocument(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(doc, undefined, requestId);
});
