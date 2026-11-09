// ==============================================================================
// PERMISSIONS & RBAC INTEGRATION TESTS
// Verifies 7 Action Pillars, Project Scoping & Fine-Grained Guard Invariants
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import { type SecurityContext } from "../src/server/auth/context";
import { requirePermission, requireProjectAccess } from "../src/server/auth/guards";

const APEX_COMPANY_ID = "c0000001-0000-0000-0000-000000000001";
const PROJECT_SKYLINE = "a0000001-0000-0000-0000-000000000001";
const PROJECT_FLYOVER = "a0000002-0000-0000-0000-000000000002";

function createRbacContext(options: {
  permissions: string[];
  roles?: Array<{ roleId: string; roleSlug: string; roleName: string; projectId?: string | null }>;
  isSuperAdmin?: boolean;
}): SecurityContext {
  return {
    user: {
      id: "test_user_id",
      email: "test@example.com",
      fullName: "Test Worker",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: "sess_test",
      userId: "test_user_id",
      refreshTokenHash: "hash",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    },
    companyId: APEX_COMPANY_ID,
    isSuperAdmin: options.isSuperAdmin || false,
    roles: options.roles || [],
    permissions: new Set(options.permissions),
  };
}

test("Permission Guard - Grants Explicit Action Permissions", () => {
  const ctx = createRbacContext({
    permissions: [
      "attendance:view",
      "attendance:approve",
      "inventory:create",
      "finance:export",
    ],
  });

  // Granted actions
  assert.doesNotThrow(() => requirePermission(ctx, "View", "attendance"));
  assert.doesNotThrow(() => requirePermission(ctx, "Approve", "attendance"));
  assert.doesNotThrow(() => requirePermission(ctx, "Create", "inventory"));
  assert.doesNotThrow(() => requirePermission(ctx, "Export", "finance"));

  // Denied actions
  assert.throws(
    () => requirePermission(ctx, "Delete", "attendance"),
    { name: "PermissionDeniedError" }
  );
  assert.throws(
    () => requirePermission(ctx, "Delete", "inventory"),
    { name: "PermissionDeniedError" }
  );
  assert.throws(
    () => requirePermission(ctx, "Manage", "finance"),
    { name: "PermissionDeniedError" }
  );
});

test("Permission Guard - 'Manage' Action Cascades to All Other Actions", () => {
  const ctx = createRbacContext({
    permissions: ["documents:manage"],
  });

  // Having 'documents:manage' should permit View, Create, Update, Delete, Approve, Export
  assert.doesNotThrow(() => requirePermission(ctx, "View", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Create", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Update", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Delete", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Approve", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Export", "documents"));
  assert.doesNotThrow(() => requirePermission(ctx, "Manage", "documents"));

  // Should NOT permit unrelated resources
  assert.throws(
    () => requirePermission(ctx, "View", "payroll"),
    { name: "PermissionDeniedError" }
  );
});

test("Project-Scoped Access & Permissions", () => {
  const siteEngineerContext = createRbacContext({
    permissions: [
      `attendance:approve#project:${PROJECT_SKYLINE}`,
      `documents:create#project:${PROJECT_SKYLINE}`,
    ],
    roles: [
      {
        roleId: "r1",
        roleSlug: "site_engineer",
        roleName: "Site Engineer",
        projectId: PROJECT_SKYLINE,
      },
    ],
  });

  // Approving attendance on assigned project Skyline must pass
  assert.doesNotThrow(() => {
    requirePermission(siteEngineerContext, "Approve", "attendance", { projectId: PROJECT_SKYLINE });
  });

  // Approving attendance on unassigned project Flyover must be rejected
  assert.throws(
    () => {
      requirePermission(siteEngineerContext, "Approve", "attendance", { projectId: PROJECT_FLYOVER });
    },
    { name: "PermissionDeniedError" }
  );

  // Project access check
  assert.doesNotThrow(() => requireProjectAccess(siteEngineerContext, PROJECT_SKYLINE));
  assert.throws(
    () => requireProjectAccess(siteEngineerContext, PROJECT_FLYOVER),
    { name: "ForbiddenError" }
  );
});

test("SuperAdmin Bypasses All Permission & Scope Checks", () => {
  const superAdminCtx = createRbacContext({
    permissions: [],
    isSuperAdmin: true,
  });

  assert.doesNotThrow(() => requirePermission(superAdminCtx, "Delete", "audit_logs"));
  assert.doesNotThrow(() => requirePermission(superAdminCtx, "Manage", "companies"));
  assert.doesNotThrow(() => requireProjectAccess(superAdminCtx, "arbitrary_project_id"));
});
