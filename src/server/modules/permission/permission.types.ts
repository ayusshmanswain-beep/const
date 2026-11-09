// ==============================================================================
// PERMISSION MODULE TYPES
// ==============================================================================

export const PermissionActions = ["View", "Create", "Update", "Delete", "Approve", "Export", "Manage"] as const;
export type PermissionAction = (typeof PermissionActions)[number];

export interface PermissionDto {
  id: string;
  category: string;
  action: PermissionAction;
  resource: string;
  code: string;
  description?: string;
}
