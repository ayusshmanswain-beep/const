// ==============================================================================
// NOTIFICATION REPOSITORY
// User Alerts & Multichannel Delivery Tracking
// ==============================================================================

import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import type { DbNotification } from "../../db/types";
import type { CreateNotificationInput, QueryNotificationsParams } from "./notification.types";

export class NotificationRepository {
  public async create(input: CreateNotificationInput): Promise<DbNotification> {
    const store = db.getStore();
    const notification: DbNotification = {
      id: randomUUID(),
      companyId: input.companyId,
      userId: input.userId,
      title: input.title,
      message: input.message,
      channel: input.channel || "IN_APP",
      entityType: input.entityType,
      entityId: input.entityId,
      isRead: false,
      readAt: null,
      metadata: input.metadata || {},
      createdAt: new Date(),
    };

    store.notifications.set(notification.id, notification);
    return notification;
  }

  public async findMany(
    userId: string,
    companyId: string,
    params: QueryNotificationsParams
  ): Promise<{ data: DbNotification[]; total: number; unreadCount: number }> {
    const store = db.getStore();

    let list = Array.from(store.notifications.values()).filter(
      (n) => n.userId === userId && n.companyId === companyId
    );

    const unreadCount = list.filter((n) => !n.isRead).length;

    if (params.unreadOnly) {
      list = list.filter((n) => !n.isRead);
    }

    // Sort descending by date
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    const data = list.slice(offset, offset + limit);

    return { data, total, unreadCount };
  }

  public async markAsRead(id: string, userId: string, companyId: string): Promise<DbNotification | null> {
    const store = db.getStore();
    const notif = store.notifications.get(id);

    if (!notif || notif.userId !== userId || notif.companyId !== companyId) {
      return null;
    }

    notif.isRead = true;
    notif.readAt = new Date();
    store.notifications.set(id, notif);
    return notif;
  }

  public async markAllAsRead(userId: string, companyId: string): Promise<number> {
    const store = db.getStore();
    let updated = 0;
    const now = new Date();

    for (const notif of store.notifications.values()) {
      if (notif.userId === userId && notif.companyId === companyId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = now;
        updated++;
      }
    }

    return updated;
  }
}

export const notificationRepository = new NotificationRepository();
