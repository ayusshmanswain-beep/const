// ==============================================================================
// AUDIT SERVICE
// System-Wide Forensic Event Recording & Retrieval
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { requirePermission } from "../../auth/guards";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import type { DbAuditLog } from "../../db/types";
import { auditRepository, type AuditRepository } from "./audit.repository";
import type { CreateAuditLogInput, QueryAuditLogsParams } from "./audit.types";

export class AuditService {
  private readonly repo: AuditRepository;

  constructor(repo: AuditRepository = auditRepository) {
    this.repo = repo;
  }

  public async logEvent(input: CreateAuditLogInput): Promise<DbAuditLog> {
    return this.repo.create(input);
  }

  public async queryLogs(
    ctx: SecurityContext,
    params: QueryAuditLogsParams
  ): Promise<{ data: DbAuditLog[]; meta: PaginationMeta }> {
    requirePermission(ctx, "View", "audit_logs");

    const tenantId = ctx.isSuperAdmin ? null : ctx.companyId;
    const { data, total } = await this.repo.findMany(tenantId, params);
    const meta = createPaginationMeta(params.page, params.limit, total);

    return { data, meta };
  }
}

export const auditService = new AuditService();
