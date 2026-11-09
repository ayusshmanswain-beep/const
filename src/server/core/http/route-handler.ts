// ==============================================================================
// CONSTRUCT360 ROUTE HANDLER COMPOSER
// High-Order Middleware Pipeline for Next.js App Router Route Handlers
// ==============================================================================

import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { logger } from "../logger/logger";
import { jsonError } from "../response/api-response";
import { validateCsrf } from "../security/csrf";

export interface RouteContext<TParams = Record<string, string | string[] | undefined>> {
  params: Promise<TParams> | TParams;
}

export type RouteHandlerFunction<TParams = Record<string, string | string[] | undefined>> = (
  req: NextRequest,
  context: { params: TParams; requestId: string }
) => Promise<NextResponse | Response>;

export interface RouteHandlerOptions {
  enableCsrf?: boolean;
}

export function createRouteHandler<TParams = Record<string, string | string[] | undefined>>(
  handler: RouteHandlerFunction<TParams>,
  options: RouteHandlerOptions = { enableCsrf: true }
) {
  return async (req: NextRequest, rawContext?: RouteContext<TParams>): Promise<Response> => {
    const startTime = Date.now();
    const requestId = req.headers.get("x-request-id") || `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

    try {
      // 1. CSRF Defense on State Mutations
      if (options.enableCsrf) {
        validateCsrf(req);
      }

      // 2. Resolve Next.js 15/16 async params
      let params = {} as TParams;
      if (rawContext?.params) {
        params = await Promise.resolve(rawContext.params);
      }

      // 3. Execute Handler
      const response = await handler(req, { params, requestId });

      // 4. Inject Security and Correlation Headers
      response.headers.set("x-request-id", requestId);
      response.headers.set("x-content-type-options", "nosniff");
      response.headers.set("x-frame-options", "DENY");
      response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

      const durationMs = Date.now() - startTime;
      logger.info(`${req.method} ${req.nextUrl.pathname} ${response.status}`, {
        requestId,
        route: req.nextUrl.pathname,
        durationMs,
      });

      return response;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;

      // Handle Zod Validation Errors
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
          code: i.code,
        }));

        logger.warn(`Validation failure on ${req.method} ${req.nextUrl.pathname}`, { requestId, durationMs }, err);
        return jsonError(ErrorCodes.VALIDATION_ERROR, "Request validation failed", 422, details, undefined, requestId);
      }

      // Handle Operational App Errors
      if (err instanceof AppError) {
        if (err.statusCode >= 500) {
          logger.error(`AppError on ${req.method} ${req.nextUrl.pathname}: ${err.message}`, { requestId, durationMs }, err);
        } else {
          logger.warn(`AppError on ${req.method} ${req.nextUrl.pathname}: ${err.message}`, { requestId, durationMs });
        }

        return jsonError(err.code, err.message, err.statusCode, err.details, undefined, requestId);
      }

      // Handle Unhandled System Exceptions
      logger.error(`Unhandled internal error on ${req.method} ${req.nextUrl.pathname}`, { requestId, durationMs }, err);
      return jsonError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        "An unexpected error occurred. Please try again later.",
        500,
        undefined,
        undefined,
        requestId
      );
    }
  };
}
