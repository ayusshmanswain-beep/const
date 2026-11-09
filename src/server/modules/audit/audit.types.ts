// ==============================================================================
// AUDIT MODULE TYPES
// ==============================================================================

import { z } from "zod";
import { PaginationQuerySchema } from "../../core/response/pagination";

export interface CreateAuditLogInput {
  companyId?: string | null;
  actorUserId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  changedFields?: string[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const QueryAuditLogsSchema = PaginationQuerySchema.extend({
  tableName: z.string().optional(),
  action: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type QueryAuditLogsParams = z.infer<typeof QueryAuditLogsSchema>;
