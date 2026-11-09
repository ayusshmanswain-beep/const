// ==============================================================================
// GET /api/v1/attendance/sessions
// Filterable Attendance Sessions & Verification Logs
// ==============================================================================

import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { jsonOk } from "@/server/core/response/api-response";
import { parsePaginationParams } from "@/server/core/response/pagination";
import { db } from "@/server/db/client";
import { attendanceService } from "@/server/modules/attendance/attendance.service";

export const GET = createRouteHandler(async (req, { requestId }) => {
  const ctx = await resolveSecurityContext(req);
  const pagination = parsePaginationParams(req.nextUrl);
  const siteId = req.nextUrl.searchParams.get("siteId") || undefined;
  const employeeId = req.nextUrl.searchParams.get("employeeId") || undefined;
  const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") || undefined;
  const status = (req.nextUrl.searchParams.get("status") as any) || undefined;
  const verificationStatus =
    (req.nextUrl.searchParams.get("verificationStatus") as any) || undefined;

  const { data, meta } = await attendanceService.querySessions(
    {
      ...pagination,
      siteId,
      employeeId,
      startDate,
      endDate,
      status,
      verificationStatus,
    },
    ctx
  );

  const store = db.getStore();
  const enriched = data.map((session) => {
    const site = store.sites.get(session.siteId);
    let workerName = "Unknown Worker";
    let workerCode = "";

    if (session.workerType === "EMPLOYEE" && session.employeeId) {
      const emp = store.employees.get(session.employeeId);
      if (emp) {
        workerName = `${emp.firstName} ${emp.lastName}`;
        workerCode = emp.employeeCode;
      }
    } else if (session.workerType === "LABOURER" && session.labourerId) {
      const lab = store.labourers.get(session.labourerId);
      if (lab) {
        workerName = `${lab.firstName} ${lab.lastName}`;
        workerCode = lab.labourerCode;
      }
    }

    // Attach latest punch event for verification telemetry
    const sessionEvents = Array.from(store.attendanceEvents.values())
      .filter((ev) => ev.sessionId === session.id)
      .sort((a, b) => b.serverTimestamp.getTime() - a.serverTimestamp.getTime());

    return {
      ...session,
      siteName: site?.name || "Site",
      siteCode: site?.siteCode,
      workerName,
      workerCode,
      lastEvent: sessionEvents[0] || null,
      events: sessionEvents,
    };
  });

  return jsonOk(enriched, meta, undefined, requestId);
});
