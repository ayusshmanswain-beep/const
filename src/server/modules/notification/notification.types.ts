// ==============================================================================
// NOTIFICATION MODULE TYPES
// ==============================================================================

import { z } from "zod";
import { PaginationQuerySchema } from "../../core/response/pagination";

export const NotificationChannelEnum = z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  title: string;
  message: string;
  channel?: NotificationChannel;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export const QueryNotificationsSchema = PaginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().default(false),
});

export type QueryNotificationsParams = z.infer<typeof QueryNotificationsSchema>;
