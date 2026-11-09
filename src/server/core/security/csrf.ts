// ==============================================================================
// CONSTRUCT360 CSRF DEFENSE ENGINE
// Origin / Sec-Fetch-Site Validation & Custom Header Protection
// ==============================================================================

import type { NextRequest } from "next/server";
import { CsrfError } from "../errors/app-error";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function validateCsrf(req: NextRequest): void {
  // Safe read-only HTTP methods do not require CSRF checks
  if (SAFE_METHODS.has(req.method)) {
    return;
  }

  // API calls carrying verified custom headers are intrinsically protected against simple cross-origin CSRF
  const customHeader = req.headers.get("x-construct-csrf") || req.headers.get("x-requested-with");
  if (customHeader) {
    return;
  }

  // Modern browser Sec-Fetch-Site check
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    throw new CsrfError("Cross-origin request rejected by Sec-Fetch-Site policy");
  }

  // Origin / Referer validation
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        throw new CsrfError(`Origin mismatch: ${originHost} does not match host ${host}`);
      }
    } catch (e) {
      if (e instanceof CsrfError) throw e;
      throw new CsrfError("Malformed Origin header in mutation request");
    }
  }
}
