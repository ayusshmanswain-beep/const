// ==============================================================================
// TENANT ISOLATION INTEGRATION TESTS
// Verifies Multi-Tenant Hardening, Cross-Tenant Rejection & Context Boundaries
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import { type SecurityContext } from "../src/server/auth/context";
import { requireTenant } from "../src/server/auth/guards";
import { dataStore } from "../src/server/db/store";
import { companyService } from "../src/server/modules/company/company.service";
import { userService } from "../src/server/modules/user/user.service";

const APEX_COMPANY_ID = "c0000001-0000-0000-0000-000000000001";
const METRO_COMPANY_ID = "c0000002-0000-0000-0000-000000000002";

function createMockSecurityContext(options: {
  userId: string;
  email: string;
  companyId: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}): SecurityContext {
  return {
    user: {
      id: options.userId,
      email: options.email,
      fullName: "Test User",
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: "session_mock_id",
      userId: options.userId,
      refreshTokenHash: "hash",
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
    },
    companyId: options.companyId,
    isSuperAdmin: options.isSuperAdmin || false,
    roles: [],
    permissions: new Set(options.permissions || ["companies:view", "companies:update", "users:view"]),
  };
}

test("Tenant Guard - Strictly Blocks Cross-Tenant Access", () => {
  const apexUserContext = createMockSecurityContext({
    userId: "user_apex_1",
    email: "engineer@apexinfra.com",
    companyId: APEX_COMPANY_ID,
  });

  // Accessing own tenant should pass
  assert.doesNotThrow(() => {
    requireTenant(apexUserContext, APEX_COMPANY_ID);
  });

  // Accessing foreign tenant must throw TenantAccessDeniedError
  assert.throws(
    () => {
      requireTenant(apexUserContext, METRO_COMPANY_ID);
    },
    {
      name: "TenantAccessDeniedError",
    }
  );
});

test("SuperAdmin Can Administer Any Tenant", () => {
  const superAdminContext = createMockSecurityContext({
    userId: "u0000001-0000-0000-0000-000000000001",
    email: "superadmin@construct360.internal",
    companyId: APEX_COMPANY_ID,
    isSuperAdmin: true,
  });

  assert.doesNotThrow(() => {
    requireTenant(superAdminContext, METRO_COMPANY_ID);
  });
});

test("Company Service - Rejects Cross-Tenant Company Inspection", async () => {
  dataStore.reset();

  const apexContext = createMockSecurityContext({
    userId: "user_apex_1",
    email: "pm@apexinfra.com",
    companyId: APEX_COMPANY_ID,
    permissions: ["companies:view"],
  });

  // Viewing Apex should succeed
  const apexComp = await companyService.getCompany(APEX_COMPANY_ID, apexContext);
  assert.equal(apexComp.id, APEX_COMPANY_ID);

  // Viewing Metro Builtcon must fail
  await assert.rejects(
    async () => {
      await companyService.getCompany(METRO_COMPANY_ID, apexContext);
    },
    {
      name: "TenantAccessDeniedError",
    }
  );
});

test("User Service - Scopes Users to Current Company Tenant Only", async () => {
  dataStore.reset();

  const apexContext = createMockSecurityContext({
    userId: "u0000002-0000-0000-0000-000000000002",
    email: "rajesh.menon@apexinfra.com",
    companyId: APEX_COMPANY_ID,
    permissions: ["users:view"],
  });

  const { data } = await userService.listUsers(APEX_COMPANY_ID, { page: 1, limit: 20, sortOrder: "desc" }, apexContext);

  assert.ok(data.length > 0, "Users should be returned for own tenant");

  // Cannot list users of a foreign tenant
  await assert.rejects(
    async () => {
      await userService.listUsers(METRO_COMPANY_ID, { page: 1, limit: 20, sortOrder: "desc" }, apexContext);
    },
    {
      name: "TenantAccessDeniedError",
    }
  );
});
