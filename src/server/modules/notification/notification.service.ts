// ==============================================================================
// NOTIFICATION SERVICE
// ==============================================================================

import type { SecurityContext } from "../../auth/context";
import { NotFoundError } from "../../core/errors/app-error";
import { createPaginationMeta, type PaginationMeta } from "../../core/response/pagination";
import type { DbNotification } from "../../db/types";
import { notificationRepository, type NotificationRepository } from "./notification.repository";
import type { CreateNotificationInput, QueryNotificationsParams } from "./notification.types";

export class NotificationService {
  private readonly repo: NotificationRepository;

  constructor(repo: NotificationRepository = notificationRepository) {
    this.repo = repo;
  }

  public async send(input: CreateNotificationInput): Promise<DbNotification> {
    return this.repo.create(input);
  }

  public async getMyNotifications(
    ctx: SecurityContext,
    params: QueryNotificationsParams
  ): Promise<{ data: DbNotification[]; meta: PaginationMeta; unreadCount: number }> {
    const { data, total, unreadCount } = await this.repo.findMany(ctx.user.id, ctx.companyId, params);
    const meta = createPaginationMeta(params.page, params.limit, total);
    return { data, meta, unreadCount };
  }

  public async markAsRead(notificationId: string, ctx: SecurityContext): Promise<DbNotification> {
    const notif = await this.repo.markAsRead(notificationId, ctx.user.id, ctx.companyId);
    if (!notif) {
      throw new NotFoundError("Notification", notificationId);
    }
    return notif;
  }

  public async markAllAsRead(ctx: SecurityContext): Promise<{ updatedCount: number }> {
    const updatedCount = await this.repo.markAllAsRead(ctx.user.id, ctx.companyId);
    return { updatedCount };
  }
}

export const notificationService = new NotificationService();
