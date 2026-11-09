// ==============================================================================
// AUDIT REPOSITORY
// Immutable Audit Trail Data Access
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbAuditLog } from "../../db/types";
import type { CreateAuditLogInput, QueryAuditLogsParams } from "./audit.types";

export class AuditRepository {
  public async create(input: CreateAuditLogInput): Promise<DbAuditLog> {
    const store = db.getStore();
    const log: DbAuditLog = {
      id: randomUUID(),
      companyId: input.companyId || null,
      actorUserId: input.actorUserId || null,
      action: input.action,
      tableName: input.tableName,
      recordId: input.recordId || null,
      oldData: input.oldData || null,
      newData: input.newData || null,
      changedFields: input.changedFields || [],
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      createdAt: new Date(),
    };

    store.auditLogs.unshift(log); // Prepend to store chronologically descending
    return log;
  }

  public async findMany(
    companyId: string | null,
    params: QueryAuditLogsParams
  ): Promise<{ data: DbAuditLog[]; total: number }> {
    const store = db.getStore();

    let logs = store.auditLogs;

    // Filter by tenant
    if (companyId) {
      logs = logs.filter((l) => l.companyId === companyId || l.companyId === null);
    }

    // Filter by table
    if (params.tableName) {
      logs = logs.filter((l) => l.tableName.toLowerCase() === params.tableName?.toLowerCase());
    }

    // Filter by action
    if (params.action) {
      logs = logs.filter((l) => l.action.toLowerCase() === params.action?.toLowerCase());
    }

    // Filter by actor
    if (params.actorUserId) {
      logs = logs.filter((l) => l.actorUserId === params.actorUserId);
    }

    // Filter by dates
    if (params.startDate) {
      logs = logs.filter((l) => l.createdAt >= params.startDate!);
    }
    if (params.endDate) {
      logs = logs.filter((l) => l.createdAt <= params.endDate!);
    }

    const total = logs.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = logs.slice(offset, offset + limit);

    return { data, total };
  }
}

export const auditRepository = new AuditRepository();
