// ==============================================================================
// POST /api/v1/auth/switch-role
// Development & Demonstration Role-Switcher for Seamless Portal Testing
// ==============================================================================

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/server/core/security/tokens";
import { db } from "@/server/db/client";
import type { DbUserSession } from "@/server/db/types";

const SwitchRoleSchema = z.object({
  role: z.enum(["admin", "engineer", "pm"]),
});

const ROLE_USER_MAP = {
  admin: "u0000002-0000-0000-0000-000000000002", // Rajesh Menon
  engineer: "u0000004-0000-0000-0000-000000000004", // Vikram Singh
  pm: "u0000003-0000-0000-0000-000000000003", // Suresh Kumar
};

export const POST = createRouteHandler(
  async (req, { requestId }) => {
    const body = await req.json();
    const { role } = SwitchRoleSchema.parse(body);

    const store = db.getStore();
    const userId = ROLE_USER_MAP[role];
    const user = store.users.get(userId);
    if (!user) {
      throw new Error("Target user not found");
    }

    const sessionId = randomUUID();
    const session: DbUserSession = {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: "dev_mock_hash",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    store.sessions.set(session.id, session);

    const signedToken = signSessionToken(session.id);
    const response = jsonOk(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        role,
      },
      undefined,
      undefined,
      requestId
    );

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  },
  { enableCsrf: false }
);
