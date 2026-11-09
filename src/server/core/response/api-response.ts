// ==============================================================================
// CONSTRUCT360 UNIFIED API RESPONSE ENVELOPES
// Enforces Consistent Response Shapes Across App Router Route Handlers
// ==============================================================================

import { NextResponse } from "next/server";
import type { ApiErrorDetail } from "../errors/app-error";
import type { PaginationMeta } from "./pagination";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  requestId: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function jsonOk<T>(
  data: T,
  meta?: PaginationMeta,
  headers?: HeadersInit,
  requestId = "req_anon"
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
      requestId,
    },
    {
      status: 200,
      headers,
    }
  );
}

export function jsonCreated<T>(
  data: T,
  headers?: HeadersInit,
  requestId = "req_anon"
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      requestId,
    },
    {
      status: 201,
      headers,
    }
  );
}

export function jsonError(
  code: string,
  message: string,
  status = 500,
  details?: ApiErrorDetail[],
  headers?: HeadersInit,
  requestId = "req_anon"
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
      requestId,
    },
    {
      status,
      headers,
    }
  );
}
