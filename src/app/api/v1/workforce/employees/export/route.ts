// ==============================================================================
// GET /api/v1/workforce/employees/export
// Export Employee Records as CSV
// ==============================================================================

import { NextResponse } from "next/server";
import { resolveSecurityContext } from "@/server/auth/context";
import { createRouteHandler } from "@/server/core/http/route-handler";
import { workforceService } from "@/server/modules/workforce/workforce.service";

export const GET = createRouteHandler(async (req) => {
  const ctx = await resolveSecurityContext(req);
  const csvData = await workforceService.exportEmployeesCsv(ctx);

  return new NextResponse(csvData, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="construct360_employees_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
