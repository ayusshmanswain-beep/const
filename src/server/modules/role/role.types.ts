// ==============================================================================
// ROLE MODULE TYPES & SCHEMAS
// ==============================================================================

import { z } from "zod";

export const CreateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9_]+$/, "Slug must be lowercase alphanumeric with underscores"),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export const AssignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1, "At least one permission must be selected"),
});

export type AssignPermissionsInput = z.infer<typeof AssignPermissionsSchema>;
