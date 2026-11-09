// ==============================================================================
// GET & POST /api/v1/projects/[id]/wbs
// Work Breakdown Structure (WBS) & Hierarchical Tree
// ==============================================================================

import { z } from "zod";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonCreated, jsonOk } from "@/server/core/response/api-response";
import { projectService } from "@/server/modules/project/project.service";

const CreateWbsNodeSchema = z.object({
  wbsCode: z.string().min(1).max(20),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  parentWbsId: z.string().uuid().optional(),
  orderIndex: z.number().int().optional(),
});

export const GET = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const tree = await projectService.getWbsTree(params.id, ctx);
  return jsonOk(tree, undefined, undefined, requestId);
});

export const POST = createRouteHandler<{ id: string }>(async (req, { params, requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const body = await req.json();
  const validated = CreateWbsNodeSchema.parse(body);

  const node = await projectService.createWbsNode(
    {
      ...validated,
      projectId: params.id,
    },
    ctx
  );

  return jsonCreated(node, undefined, requestId);
});
