// ==============================================================================
// USER MODULE TYPES & SCHEMAS
// ==============================================================================

import { z } from "zod";
import { PaginationQuerySchema } from "../../core/response/pagination";

export const InviteUserSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address format" }),
  roleId: z.string().uuid({ message: "Valid role UUID required" }),
  defaultBranchId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;

export const UpdateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phoneNumber: z.string().max(30).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const ToggleUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type ToggleUserStatusInput = z.infer<typeof ToggleUserStatusSchema>;

export const AssignRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).min(1, "At least one role must be provided"),
  projectId: z.string().uuid().optional(),
});

export type AssignRolesInput = z.infer<typeof AssignRolesSchema>;

export const QueryUsersSchema = PaginationQuerySchema.extend({
  roleSlug: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type QueryUsersParams = z.infer<typeof QueryUsersSchema>;
