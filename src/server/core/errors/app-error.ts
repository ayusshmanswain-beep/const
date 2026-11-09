// ==============================================================================
// CONSTRUCT360 APPLICATION ERROR HIERARCHY
// Centralized, Typed & Auditable Error Representation
// ==============================================================================

import { ErrorCodes, type ErrorCode } from "./error-codes";

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: ApiErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: ApiErrorDetail[]) {
    super(message, 400, ErrorCodes.BAD_REQUEST, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ApiErrorDetail[]) {
    super(message, 422, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code: ErrorCode = ErrorCodes.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", code: ErrorCode = ErrorCodes.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class TenantAccessDeniedError extends ForbiddenError {
  constructor(companyId?: string) {
    super(
      companyId ? `Access denied to tenant organization '${companyId}'` : "Access denied to target organization",
      ErrorCodes.TENANT_ACCESS_DENIED
    );
  }
}

export class PermissionDeniedError extends ForbiddenError {
  constructor(action: string, resource: string) {
    super(`Required permission '${action}:${resource}' denied`, ErrorCodes.PERMISSION_DENIED);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", id?: string) {
    super(id ? `${resource} with identifier '${id}' was not found` : `${resource} not found`, 404, ErrorCodes.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists or conflicting state") {
    super(message, 409, ErrorCodes.CONFLICT);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.", retryAfterSeconds?: number) {
    super(
      message,
      429,
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      retryAfterSeconds ? [{ message: `Retry after ${retryAfterSeconds} seconds` }] : undefined
    );
  }
}

export class CsrfError extends AppError {
  constructor(message = "Cross-Site Request Forgery (CSRF) verification failed") {
    super(message, 403, ErrorCodes.CSRF_DETECTED);
  }
}
