# CONSTRUCT360 — Backend API Specification & Conventions

> **Specification Version:** 1.0.0-PROD  
> **Framework:** Next.js 16+ (App Router Route Handlers)  
> **Runtime Target:** Vercel Serverless / Node.js 20+  
> **API Version:** v1 (`/api/v1`)  
> **Content-Type:** `application/json` (unless binary stream)  

---

## 1. Architectural Foundations

CONSTRUCT360 backend is architected as a **Modular Monolith** using Next.js App Router. Each domain operates as an autonomous module containing typed schemas, data-access repositories, and a domain service layer.

```
+----------------------------------------------------------------------------------------------------+
|                                  CONSTRUCT360 BACKEND RUNTIME                                      |
+----------------------------------------------------------------------------------------------------+
|  HTTP Entry Points    | Next.js Route Handlers (`src/app/api/v1/...`)                              |
|  Pipeline Wrapper     | `createRouteHandler` (CSRF, Request ID, Logging, Correlation, Errors)      |
|  Security Context     | `resolveSecurityContext` (Session Cookie/Bearer, User, Active Tenant, RBAC)|
|  Domain Services      | Typed Service Layer (`AuthService`, `CompanyService`, `UserService`, etc.)|
|  Repository Layer     | Atomic Data Access Layer (Multi-tenant scoped, connection pool safe)       |
|  Response Envelope    | Standardized `{ success: true, data, meta?, requestId }`                   |
+----------------------------------------------------------------------------------------------------+
```

### Serverless & Connection Pooling Guarantees
1. **Zero Permanent Daemons:** The backend does not spawn `setInterval` loops or persistent background threads that destabilize serverless lambdas.
2. **State & Connection Singletons:** Database connection handles and shared state anchor to `globalThis` to preserve connection pooling across warm lambda invocations.
3. **No Presentation Database Access:** Presentation components (React Server Components / Client Components) never issue raw database queries directly; all operations route through the typed service layer or API endpoints.

---

## 2. API Conventions & Response Envelopes

### 2.1 Standard Success Envelope
All successful requests return HTTP 200 (or 201 Created) with a consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "totalRecords": 85,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "requestId": "req_84f92d18a02c"
}
```

### 2.2 Standard Error Envelope
All client or server failures return RFC 7807-aligned error structures:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email address format",
        "code": "invalid_string"
      }
    ]
  },
  "requestId": "req_84f92d18a02c"
}
```

### 2.3 Error Codes Taxonomy

| Error Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | 401 | Missing, malformed, or invalid authentication credentials. |
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect. |
| `SESSION_EXPIRED` | 401 | Session lifetime elapsed or idle timeout triggered. |
| `MFA_REQUIRED` | 200/401 | User possesses MFA; valid 6-digit TOTP code required. |
| `INVALID_MFA_CODE` | 401 | TOTP token invalid or outside drift tolerance window. |
| `FORBIDDEN` | 403 | Authenticated user lacks authority for the operation. |
| `TENANT_ACCESS_DENIED` | 403 | User is not affiliated with the requested company context. |
| `PERMISSION_DENIED` | 403 | User role lacks the required granular action permission. |
| `PROJECT_ACCESS_DENIED` | 403 | User role is scoped to a different project workfront. |
| `CSRF_DETECTED` | 403 | Cross-Origin mutation rejected by Sec-Fetch-Site or origin policy. |
| `NOT_FOUND` | 404 | Target entity identifier was not found within active tenant scope. |
| `CONFLICT` | 409 | Duplicate unique constraint breach (e.g. employee code or email). |
| `VALIDATION_ERROR` | 422 | Input payload failed Zod schema assertions. |
| `RATE_LIMIT_EXCEEDED` | 429 | Sliding-window request rate limit breached. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server exception (logged with stack trace). |

### 2.4 Pagination, Sorting & Filtering
Listing endpoints adhere to standard URL query parameters:
* `page`: Integer >= 1 (Default: `1`).
* `limit`: Integer between 1 and 100 (Default: `20`).
* `search`: Case-insensitive substring query on primary identifiers and titles.
* `sortBy`: Name of field to sort by.
* `sortOrder`: `asc` or `desc` (Default: `desc`).

---

## 3. Security Architecture

### 3.1 Session & Cookie Management
* **Cookie Name:** `c360_session`.
* **Attributes:** `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800` (7 days).
* **Token Structure:** `${sessionId}.${hmac_signature}`.
* **Tamper Proofing:** The session cookie is signed with HMAC-SHA256. If a client attempts to forge or manipulate the session ID, `verifySessionToken` fails via `timingSafeEqual`.
* **Mobile / Kiosk Auth:** Native clients may transmit the session token via `Authorization: Bearer <signed_token>`.

### 3.2 Tenant Context Switching
Multi-tenant users (e.g. consultants or executives affiliated with multiple branches/companies) can specify the active organization context via:
* Header: `x-company-id: <uuid>`
The server verifies membership in `user_company_memberships`. If the user does not possess active membership (and is not platform SuperAdmin), `TENANT_ACCESS_DENIED` (403) is immediately enforced.

### 3.3 CSRF Protection
Mutation endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require:
1. `Sec-Fetch-Site: same-origin` or matching `Origin` / `Host` headers.
2. Or custom request header: `x-construct-csrf: 1` / `x-requested-with: XMLHttpRequest`.

### 3.4 Rate Limiting
Public authentication endpoints enforce sliding-window rate limits:
* `POST /api/v1/auth/login`: Maximum 5 attempts per 60 seconds per IP + Email.
* `POST /api/v1/auth/password/reset-request`: Maximum 3 attempts per 5 minutes per IP.

---

## 4. Server-Side RBAC & Permissions Engine

CONSTRUCT360 authorizes operations across **7 Action Pillars**:

| Pillar | Description | Example Code |
| :--- | :--- | :--- |
| **`View`** | Read records, summaries, and dashboards. | `attendance:view`, `companies:view` |
| **`Create`** | Initiate new records (DPRs, POs, users, site punches). | `documents:create`, `users:create` |
| **`Update`** | Modify existing non-immutable entities. | `projects:update`, `roles:update` |
| **`Delete`** | Soft or hard removal of authorized assets. | `documents:delete`, `tasks:delete` |
| **`Approve`** | Multi-level sign-off for expenses, DPRs, timesheets, and GRNs. | `attendance:approve`, `expenses:approve` |
| **`Export`** | Extraction of payroll files, accounting logs, and DPR summaries. | `audit_logs:export`, `finance:export` |
| **`Manage`** | Super-permission granting all 6 actions on the target resource. | `companies:manage`, `roles:manage` |

### Scope Hierarchy
1. **Global SuperAdmin:** Bypasses all tenant and permission checks.
2. **Company-Wide Roles:** Applies to all projects and sites within the company boundary.
3. **Project-Scoped Roles:** Limits actions to a specific `projectId` (e.g. Site Engineer assigned only to "Skyline Tech Park").

---

## 5. Exhaustive Endpoint Documentation

### 5.1 Authentication Module (`/api/v1/auth`)

#### `POST /api/v1/auth/login`
Authenticates user credentials and issues an HTTP-only signed session cookie.

* **Request Body:**
  ```json
  {
    "email": "suresh.kumar@apexinfra.com",
    "password": "Construct360#Secure2026",
    "mfaCode": "123456" // Optional, required if user has MFA enabled
  }
  ```
* **Success Response (No MFA / MFA Verified):**
  ```json
  {
    "success": true,
    "data": {
      "mfaRequired": false,
      "user": {
        "id": "u0000003-0000-0000-0000-000000000003",
        "email": "suresh.kumar@apexinfra.com",
        "fullName": "Suresh Kumar (Project Manager)",
        "companyId": "c0000001-0000-0000-0000-000000000001",
        "mfaEnabled": false
      }
    },
    "requestId": "req_a1b2c3d4"
  }
  ```
* **MFA Required Challenge:**
  ```json
  {
    "success": true,
    "data": {
      "mfaRequired": true
    },
    "requestId": "req_a1b2c3d4"
  }
  ```

#### `POST /api/v1/auth/logout`
Revokes active session record and expires the `c360_session` cookie.

* **Response:**
  ```json
  {
    "success": true,
    "data": { "loggedOut": true },
    "requestId": "req_logout123"
  }
  ```

#### `GET /api/v1/auth/me`
Retrieves current session identity, tenant context, active roles, and granted permissions.

* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "u0000003-0000-0000-0000-000000000003",
        "email": "suresh.kumar@apexinfra.com",
        "fullName": "Suresh Kumar",
        "mfaEnabled": false
      },
      "companyId": "c0000001-0000-0000-0000-000000000001",
      "isSuperAdmin": false,
      "roles": [
        {
          "roleId": "r0000002-0000-0000-0000-000000000002",
          "roleSlug": "project_manager",
          "roleName": "Project Manager",
          "projectId": "a0000001-0000-0000-0000-000000000001"
        }
      ],
      "permissions": [
        "projects:view",
        "attendance:view",
        "attendance:approve#project:a0000001-0000-0000-0000-000000000001"
      ]
    },
    "requestId": "req_me123"
  }
  ```

#### `POST /api/v1/auth/password/reset-request`
Dispatches a single-use password reset token with 1-hour expiration.

* **Request Body:** `{ "email": "suresh.kumar@apexinfra.com" }`
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "message": "If that email exists in our system, a password reset link has been dispatched."
    },
    "requestId": "req_reset123"
  }
  ```

#### `POST /api/v1/auth/password/reset`
Confirms token validity, updates password hash via scrypt, and revokes all previous active sessions.

* **Request Body:**
  ```json
  {
    "token": "4a7b9c2e...",
    "newPassword": "NewStrongPassword2026#"
  }
  ```

#### `POST /api/v1/auth/invite/accept`
Accepts an organization invitation, completes account registration, and logs the user in.

* **Request Body:**
  ```json
  {
    "token": "invitation_token_hex",
    "fullName": "Kavita Rao",
    "password": "SecurePassword#2026"
  }
  ```

#### `POST /api/v1/auth/mfa/setup`
Generates RFC 6238 Base32 secret and `otpauth://` URI for authenticator app configuration.

* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "secret": "JBSWY3DPEHPK3PXP",
      "otpAuthUri": "otpauth://totp/CONSTRUCT360:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=CONSTRUCT360"
    },
    "requestId": "req_mfa1"
  }
  ```

#### `POST /api/v1/auth/mfa/verify`
Confirms user can generate valid TOTP codes and activates `mfaEnabled` on user profile.

* **Request Body:** `{ "code": "492015" }`
* **Response:** `{ "success": true, "data": { "verified": true } }`

---

### 5.2 Company Module (`/api/v1/companies`)

#### `GET /api/v1/companies`
Lists organizations accessible to the authenticated user.

* **Query Parameters:** `page`, `limit`, `search`
* **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c0000001-0000-0000-0000-000000000001",
        "code": "APEX-INFR",
        "legalName": "Apex Infrastructure Projects Ltd",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "isActive": true
      }
    ],
    "meta": { "page": 1, "limit": 20, "totalRecords": 1, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false },
    "requestId": "req_comp1"
  }
  ```

#### `GET /api/v1/companies/:id`
Retrieves organizational metadata. Enforces tenant boundary.

#### `PATCH /api/v1/companies/:id`
Updates company trading name, tax registration number, timezone, or operating settings.
* **Required Permission:** `companies:update`

#### `GET /api/v1/companies/:id/branches`
Lists regional branches, zonal offices, and site headquarters.
* **Required Permission:** `branches:view`

#### `POST /api/v1/companies/:id/branches`
Registers a new regional operating branch.
* **Required Permission:** `branches:create`
* **Request Body:**
  ```json
  {
    "code": "HYD-ZONAL",
    "name": "Hyderabad Zonal Hub",
    "addressLine1": "HITEC City Phase 2",
    "city": "Hyderabad",
    "state": "Telangana",
    "postalCode": "500081",
    "isHeadquarters": false
  }
  ```

---

### 5.3 User Module (`/api/v1/users`)

#### `GET /api/v1/users`
Lists members affiliated with the active company tenant.
* **Required Permission:** `users:view`
* **Query Parameters:** `page`, `limit`, `search`, `status` (`active` | `inactive`)

#### `POST /api/v1/users/invite`
Dispatches an organization invitation with an assigned role.
* **Required Permission:** `users:create`
* **Request Body:**
  ```json
  {
    "email": "kavita.rao@apexinfra.com",
    "roleId": "r0000003-0000-0000-0000-000000000003",
    "projectId": "a0000001-0000-0000-0000-000000000001"
  }
  ```

#### `PATCH /api/v1/users/:id/status`
Toggles active status (deactivating/activating user accounts).
* **Required Permission:** `users:manage`
* **Request Body:** `{ "isActive": false }`

#### `POST /api/v1/users/:id/roles`
Assigns or revokes tenant and project roles for a user.
* **Required Permission:** `roles:manage`
* **Request Body:**
  ```json
  {
    "roleIds": ["r0000002-0000-0000-0000-000000000002"],
    "projectId": "a0000001-0000-0000-0000-000000000001"
  }
  ```

---

### 5.4 Roles & Permissions Modules (`/api/v1/roles`, `/api/v1/permissions`)

#### `GET /api/v1/roles`
Lists tenant roles and system baseline roles with assigned permissions.
* **Required Permission:** `roles:view`

#### `POST /api/v1/roles`
Creates a custom company role.
* **Required Permission:** `roles:create`
* **Request Body:**
  ```json
  {
    "name": "Quality Assurance Auditor",
    "slug": "qa_auditor",
    "description": "Reviews snag lists, pour cards, and testing labs",
    "permissionIds": ["perm_uuid_1", "perm_uuid_2"]
  }
  ```

#### `POST /api/v1/roles/:id/permissions`
Updates the permissions mapped to a role.
* **Required Permission:** `roles:manage`
* **Request Body:** `{ "permissionIds": ["uuid_1", "uuid_2"] }`

#### `GET /api/v1/permissions`
Lists the complete fine-grained system permission catalog.
* **Required Permission:** `permissions:view`

---

### 5.5 Audit Logs Module (`/api/v1/audit-logs`)

#### `GET /api/v1/audit-logs`
Queries the immutable forensic audit log.
* **Required Permission:** `audit_logs:view`
* **Query Parameters:** `page`, `limit`, `tableName`, `action`, `actorUserId`, `startDate`, `endDate`
* **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "audit_uuid_1",
        "companyId": "c0000001-0000-0000-0000-000000000001",
        "actorUserId": "u0000002-0000-0000-0000-000000000002",
        "action": "UPDATE_COMPANY",
        "tableName": "companies",
        "recordId": "c0000001-0000-0000-0000-000000000001",
        "oldData": { "tradeName": "Apex" },
        "newData": { "tradeName": "Apex Infra" },
        "createdAt": "2026-11-09T08:30:00.000Z"
      }
    ],
    "meta": { ... }
  }
  ```

---

### 5.6 Notifications Module (`/api/v1/notifications`)

#### `GET /api/v1/notifications`
Retrieves user alerts, approval requests, and site warnings.
* **Query Parameters:** `page`, `limit`, `unreadOnly` (`true` | `false`)
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "notif_uuid",
          "title": "Attendance Flagged",
          "message": "Worker LAB-0412 clocked in 280m outside geofence perimeter.",
          "isRead": false,
          "createdAt": "2026-11-09T08:00:00.000Z"
        }
      ],
      "unreadCount": 3
    }
  }
  ```

#### `POST /api/v1/notifications/:id/read`
Marks a specific notification as acknowledged/read.

#### `POST /api/v1/notifications/read-all`
Marks all notifications within active company scope as read.

---

### 5.7 File Management Module (`/api/v1/files`)

#### `POST /api/v1/files/upload`
Initiates file metadata registration and generates an authorized pre-signed S3 upload URL.
* **Required Permission:** `documents:create`
* **Request Body:**
  ```json
  {
    "category": "STRUCTURAL_DRAWING",
    "documentCode": "DWG-SKY-STR-PODIUM-R3",
    "title": "Podium Slab Rebar Detail REV-03",
    "fileName": "Podium_Rebar_REV3.dwg",
    "fileSizeBytes": 14582900,
    "mimeType": "application/octet-stream",
    "checksumSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "projectId": "a0000001-0000-0000-0000-000000000001"
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "document": {
        "id": "doc_uuid_1",
        "currentVersion": 1,
        "documentCode": "DWG-SKY-STR-PODIUM-R3",
        "fileName": "Podium_Rebar_REV3.dwg"
      },
      "uploadUrl": "https://construct360-assets.internal.storage/upload?key=companies/c1/docs/Podium_Rebar_REV3.dwg...",
      "storageKey": "companies/c0000001.../docs/Podium_Rebar_REV3.dwg"
    }
  }
  ```

#### `GET /api/v1/files/:id/download`
Verifies user has permission on the document's project scope and emits a signed, time-limited retrieval URL.
* **Required Permission:** `documents:view`
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "downloadUrl": "https://construct360-assets.internal.storage/download?key=...&expires=...",
      "fileName": "Podium_Rebar_REV3.dwg",
      "mimeType": "application/octet-stream"
    }
  }
  ```
