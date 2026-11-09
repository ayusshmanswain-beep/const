// ==============================================================================
// CONSTRUCT360 GEOSPATIAL ATTENDANCE ENGINE TESTS
// Inside-Radius, Outside-Radius, Boundary, Accuracy & Site Assignment Tests
// ==============================================================================

import assert from "node:assert/strict";
import test from "node:test";
import type { SecurityContext } from "../src/server/auth/context";
import { dataStore } from "../src/server/db/store";
import { attendanceService } from "../src/server/modules/attendance/attendance.service";
import { GeospatialEngine } from "../src/server/modules/geospatial/geospatial.engine";
import { siteService } from "../src/server/modules/site/site.service";

// Helper to create mock SecurityContext for tests
function createMockContext(userId: string, isSuperAdmin = false): SecurityContext {
  const store = dataStore;
  const user = store.users.get(userId)!;
  const membership = Array.from(store.memberships.values()).find((m) => m.userId === userId)!;
  const companyId = membership.companyId;

  const permissions = new Set<string>();
  const userRoles = Array.from(store.userRoles.values()).filter((ur) => ur.userId === userId);

  for (const ur of userRoles) {
    for (const rp of store.rolePermissions.values()) {
      if (rp.roleId === ur.roleId) {
        const perm = store.permissions.get(rp.permissionId);
        if (perm) {
          permissions.add(perm.code.toLowerCase());
        }
      }
    }
  }

  return {
    user,
    session: {
      id: "mock_session_id",
      userId,
      refreshTokenHash: "mock_hash",
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    },
    companyId,
    isSuperAdmin,
    roles: userRoles.map((ur) => ({
      roleId: ur.roleId,
      roleSlug: store.roles.get(ur.roleId)?.slug || "",
      roleName: store.roles.get(ur.roleId)?.name || "",
      projectId: ur.projectId,
    })),
    permissions,
  };
}

test("Geospatial: High-Precision WGS-84 Distance & Coordinate Validation", () => {
  // Test coordinates: Bengaluru Skyline Tower A centroid (12.935242, 77.694602)
  const siteLat = 12.935242;
  const siteLon = 77.694602;

  // Exact same point -> distance must be 0 meters
  const distZero = GeospatialEngine.calculateWgs84Distance(siteLat, siteLon, siteLat, siteLon);
  assert.equal(distZero, 0, "Distance to identical point must be exactly 0 meters");

  // Point offset ~34 meters northeast (12.935400, 77.694800)
  const dist34 = GeospatialEngine.calculateWgs84Distance(siteLat, siteLon, 12.935400, 77.694800);
  assert.ok(dist34 > 25 && dist34 < 40, `Distance should be ~28-35m, got ${dist34}m`);

  // Point ~450 meters away (12.938500, 77.697500)
  const dist450 = GeospatialEngine.calculateWgs84Distance(siteLat, siteLon, 12.938500, 77.697500);
  assert.ok(dist450 > 400 && dist450 < 550, `Distance should be ~480m, got ${dist450}m`);

  // Coordinate range validation
  assert.equal(GeospatialEngine.validateCoordinates(12.935, 77.694).valid, true);
  assert.equal(GeospatialEngine.validateCoordinates(95.0, 77.694).valid, false, "Latitude > 90 must fail");
  assert.equal(GeospatialEngine.validateCoordinates(12.935, 195.0).valid, false, "Longitude > 180 must fail");
  assert.equal(GeospatialEngine.validateCoordinates(0.0, 0.0).valid, false, "Null Island (0,0) must fail");
});

test("Scenario 1: Inside-Radius Check-in - Worker at 34m from Tower A center (Radius 150m)", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004"); // Vikram Singh

  const siteId = "s0000001-0000-0000-0000-000000000001"; // Skyline Tower A (radius: 150m)

  const result = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.935400, // ~30m from site center
      longitude: 77.694800,
      gpsAccuracyMeters: 8.5,
      isMockLocation: false,
      idempotencyKey: "punch_test_inside_001",
    },
    engineerCtx
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.isInsideGeofence, true);
  assert.ok(result.calculatedDistanceMeters < 150, "Distance must be well inside 150m radius");
  assert.equal(result.configuredRadiusSnapshotMeters, 150);
  assert.equal(result.requiresSupervisorApproval, false);

  // Verify database record
  const session = await attendanceService.getAttendanceStatus(engineerCtx);
  assert.equal(session.isCheckedIn, true);
  assert.equal(session.activeSession?.verificationStatus, "VERIFIED");
  assert.equal(session.activeSession?.status, "PRESENT");
});

test("Scenario 2: Outside-Radius Check-in - Worker at 450m from Tower A center", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const siteId = "s0000001-0000-0000-0000-000000000001"; // Radius: 150m

  const result = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.938500, // ~480m from site center
      longitude: 77.697500,
      gpsAccuracyMeters: 10.0,
      isMockLocation: false,
      idempotencyKey: "punch_test_outside_002",
    },
    engineerCtx
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "FLAGGED_OUTSIDE");
  assert.equal(result.isInsideGeofence, false);
  assert.ok(result.calculatedDistanceMeters > 150, "Distance must be outside 150m radius");
  assert.equal(result.requiresSupervisorApproval, true);

  // Verify session is flagged and pending supervisor approval
  const status = await attendanceService.getAttendanceStatus(engineerCtx);
  assert.equal(status.activeSession?.verificationStatus, "FLAGGED");
  assert.equal(status.activeSession?.approvalStatus, "PENDING");
});

test("Scenario 3: Boundary Precision - Exact Geofence Edge & Epsilon Tolerance", () => {
  const siteLat = 12.935242;
  const siteLon = 77.694602;
  const radiusMeters = 150.0;

  // Exact geodesic offset for 150.0m along the latitude parallel
  const deltaLonRad = 150.0 / (6371008.8 * Math.cos(GeospatialEngine.toRadians(siteLat)));
  const deltaLonDeg = (deltaLonRad * 180) / Math.PI;
  const edgeLon = siteLon + deltaLonDeg;

  const checkEdge = GeospatialEngine.isInsideCircularGeofence(siteLat, edgeLon, siteLat, siteLon, radiusMeters);
  assert.equal(checkEdge.distanceMeters, 150.0, "Exact edge distance must equal 150.0m");
  assert.equal(checkEdge.isInside, true, "Point right on the 150m perimeter must be inside within epsilon");

  // Point outside by 20 meters (170m)
  const deltaLonRad170 = 170.0 / (6371008.8 * Math.cos(GeospatialEngine.toRadians(siteLat)));
  const outsideLon = siteLon + (deltaLonRad170 * 180) / Math.PI;
  const checkOutside = GeospatialEngine.isInsideCircularGeofence(siteLat, outsideLon, siteLat, siteLon, radiusMeters);
  assert.equal(checkOutside.isInside, false, "Point at 170m must be strictly outside 150m geofence");
  assert.ok(checkOutside.deltaMeters > 0, "deltaMeters must be positive when outside");
});

test("Scenario 4: GPS Accuracy Ceilings - Poor Accuracy Rejection", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const siteId = "s0000001-0000-0000-0000-000000000001"; // Site max permitted accuracy is 50.0m

  // Case A: Accuracy of 120m exceeds the site's 50m ceiling -> Must throw BadRequestError
  await assert.rejects(
    async () => {
      await attendanceService.processCheckIn(
        {
          siteId,
          latitude: 12.935242,
          longitude: 77.694602,
          gpsAccuracyMeters: 120.0, // Exceeds 50m ceiling
          idempotencyKey: "punch_test_poor_accuracy",
        },
        engineerCtx
      );
    },
    (err: any) => {
      assert.ok(err.message.includes("GPS accuracy"), "Must mention GPS accuracy exceeded");
      return true;
    }
  );

  // Case B: Accuracy of 45m <= 50m ceiling -> Permitted
  const goodAccResult = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.935242,
      longitude: 77.694602,
      gpsAccuracyMeters: 45.0,
      idempotencyKey: "punch_test_good_accuracy",
    },
    engineerCtx
  );
  assert.equal(goodAccResult.success, true);
});

test("Scenario 5: Site Assignment Enforcement - Unassigned Site Rejection", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004"); // Vikram Singh assigned only to Site 1

  // Site 2: Skyline Central Amenity Hub & Clubhouse (Vikram is NOT assigned to Site 2)
  const site2Id = "s0000002-0000-0000-0000-000000000002";

  await assert.rejects(
    async () => {
      await attendanceService.processCheckIn(
        {
          siteId: site2Id,
          latitude: 12.936500,
          longitude: 77.695800,
          gpsAccuracyMeters: 10.0,
          idempotencyKey: "punch_unassigned_site",
        },
        engineerCtx
      );
    },
    (err: any) => {
      assert.ok(
        err.message.includes("Worker is not actively assigned to site"),
        "Must enforce active site assignment"
      );
      return true;
    }
  );
});

test("Scenario 6: Inactive Site Handling", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const siteId = "s0000001-0000-0000-0000-000000000001";

  // Admin deactivates/closes Site 1
  const site = dataStore.sites.get(siteId)!;
  site.status = "CLOSED";

  await assert.rejects(
    async () => {
      await attendanceService.processCheckIn(
        {
          siteId,
          latitude: 12.935242,
          longitude: 77.694602,
          gpsAccuracyMeters: 10.0,
          idempotencyKey: "punch_inactive_site",
        },
        engineerCtx
      );
    },
    (err: any) => {
      assert.ok(err.message.includes("currently CLOSED"), "Must block check-in on closed site");
      return true;
    }
  );
});

test("Scenario 7: Duplicate Active Sessions & Idempotency", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const siteId = "s0000001-0000-0000-0000-000000000001";

  // First check-in
  const punch1 = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.935400,
      longitude: 77.694800,
      gpsAccuracyMeters: 10.0,
      idempotencyKey: "punch_idem_key_001",
    },
    engineerCtx
  );
  assert.equal(punch1.success, true);

  // Exact same submission with the same idempotencyKey -> Returns cached response
  const idemPunch = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.935400,
      longitude: 77.694800,
      gpsAccuracyMeters: 10.0,
      idempotencyKey: "punch_idem_key_001",
    },
    engineerCtx
  );
  assert.equal(idemPunch.eventId, punch1.eventId);
  assert.ok(idemPunch.message.includes("Idempotent response"));

  // Attempting another check-in with a DIFFERENT idempotencyKey while session is active -> Rejected
  await assert.rejects(
    async () => {
      await attendanceService.processCheckIn(
        {
          siteId,
          latitude: 12.935400,
          longitude: 77.694800,
          gpsAccuracyMeters: 10.0,
          idempotencyKey: "punch_second_attempt_key",
        },
        engineerCtx
      );
    },
    (err: any) => {
      assert.ok(
        err.message.includes("Active attendance session already in progress"),
        "Must block duplicate active attendance sessions"
      );
      return true;
    }
  );
});

test("Scenario 8: Complete Check-Out Workflow & Duration Calculation", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const siteId = "s0000001-0000-0000-0000-000000000001";

  // Check In
  const checkIn = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.935400,
      longitude: 77.694800,
      gpsAccuracyMeters: 8.0,
      idempotencyKey: "punch_checkout_test_in",
    },
    engineerCtx
  );

  // Perform Check-Out at the end of shift
  const checkOut = await attendanceService.processCheckOut(
    {
      sessionId: checkIn.sessionId,
      siteId,
      latitude: 12.935300,
      longitude: 77.694700,
      gpsAccuracyMeters: 9.0,
      idempotencyKey: "punch_checkout_test_out",
    },
    engineerCtx
  );

  assert.equal(checkOut.success, true);
  assert.equal(checkOut.eventType, "CLOCK_OUT");
  assert.equal(checkOut.isInsideGeofence, true);

  // Status must now show checked out
  const status = await attendanceService.getAttendanceStatus(engineerCtx);
  assert.equal(status.isCheckedIn, false);
  assert.ok(status.activeSession === null || status.activeSession.lastClockOut !== null);
});

test("Scenario 9: Supervisor Exception Review & Approval", async () => {
  dataStore.reset();
  const engineerCtx = createMockContext("u0000004-0000-0000-0000-000000000004");
  const adminCtx = createMockContext("u0000002-0000-0000-0000-000000000002"); // Rajesh Menon (Admin/Supervisor)
  const siteId = "s0000001-0000-0000-0000-000000000001";

  // Engineer checks in 400m away (flagged)
  const outsidePunch = await attendanceService.processCheckIn(
    {
      siteId,
      latitude: 12.938000,
      longitude: 77.697000,
      gpsAccuracyMeters: 12.0,
      idempotencyKey: "flagged_session_punch",
    },
    engineerCtx
  );

  assert.equal(outsidePunch.status, "FLAGGED_OUTSIDE");

  // Supervisor reviews and approves the exception
  const approvedSession = await attendanceService.reviewException(
    {
      sessionId: outsidePunch.sessionId,
      decision: "APPROVED",
      comments: "Approved: Worker was picking up rebar materials at external yard adjacent to site perimeter.",
    },
    adminCtx
  );

  assert.equal(approvedSession.approvalStatus, "APPROVED");
  assert.equal(approvedSession.verificationStatus, "VERIFIED");
  assert.equal(approvedSession.status, "PRESENT");
});

test("Scenario 10: Dynamic Radius Reconfiguration & Geofence History Audit Log", async () => {
  dataStore.reset();
  const adminCtx = createMockContext("u0000002-0000-0000-0000-000000000002");
  const siteId = "s0000001-0000-0000-0000-000000000001";

  // Initial radius is 150m
  const siteBefore = await siteService.getSite(siteId, adminCtx);
  assert.equal(siteBefore.radiusMeters, 150);

  // Admin updates radius to 250m
  const updatedSite = await siteService.updateRadius(
    siteId,
    {
      radiusMeters: 250,
      reason: "Expanded perimeter to incorporate newly leased heavy vehicle staging yard",
    },
    adminCtx
  );

  assert.equal(updatedSite.radiusMeters, 250);

  // Verify geofence configuration history
  const history = await siteService.getGeofenceHistory(siteId, adminCtx);
  assert.ok(history.length >= 2, "Must contain initial baseline and updated history");
  const latest = history[0];
  assert.equal(latest.oldRadiusMeters, 150);
  assert.equal(latest.newRadiusMeters, 250);
  assert.ok(latest.reason.includes("staging yard"));
});
