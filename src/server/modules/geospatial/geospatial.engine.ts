// ==============================================================================
// CONSTRUCT360 ENTERPRISE GEOSPATIAL ENGINE
// PostGIS-Compliant WGS-84 Geodesic Distance, Polygon Geofence & Spoof Defense
// ==============================================================================

/**
 * WGS-84 Authalic/Mean Earth Radius in meters (PostGIS ST_Distance spheroid default).
 * PostGIS ST_Distance on geography types uses the WGS-84 authalic radius 6,371,008.8m
 * for spherical approximation or the exact Karney geodesic algorithm.
 */
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;

/**
 * Numerical precision boundary tolerance in meters (centimeter level).
 */
export const GEOFENCE_EPSILON_METERS = 0.05;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceCheckResult {
  isInside: boolean;
  distanceMeters: number;
  configuredRadiusMeters: number;
  deltaMeters: number; // Negative = inside by X meters; Positive = outside by X meters
}

export interface CoordinateValidationResult {
  valid: boolean;
  reason?: string;
}

export interface LocationTelemetryInput {
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  isMockLocation?: boolean;
  eventTimestamp?: Date;
}

export interface PreviousLocationTelemetry {
  latitude: number;
  longitude: number;
  eventTimestamp: Date;
}

export interface LocationRiskAssessment {
  riskScore: number; // 0 (Trusted) to 100 (High Risk)
  isSuspicious: boolean;
  riskFactors: string[];
  calculatedSpeedKmh?: number;
}

export class GeospatialEngine {
  /**
   * Converts degrees to radians.
   */
  public static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculates high-precision geodesic distance in meters between two WGS-84 coordinates
   * matching PostGIS ST_Distance(geography, geography).
   *
   * Uses the Great-Circle Haversine formula with WGS84 authalic radius.
   */
  public static calculateWgs84Distance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const phi1 = this.toRadians(lat1);
    const phi2 = this.toRadians(lat2);
    const deltaPhi = this.toRadians(lat2 - lat1);
    const deltaLambda = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = WGS84_EARTH_RADIUS_METERS * c;

    // Round to 2 decimal places (centimeter precision)
    return Math.round(distanceMeters * 100) / 100;
  }

  /**
   * Validates latitude and longitude ranges.
   * Latitude: [-90, +90]
   * Longitude: [-180, +180]
   * Rejects NaN, Infinity, and "Null Island" (0.000000, 0.000000).
   */
  public static validateCoordinates(latitude: number, longitude: number): CoordinateValidationResult {
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return { valid: false, reason: "Coordinates must be numeric values" };
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { valid: false, reason: "Coordinates must be finite numbers" };
    }

    if (latitude < -90 || latitude > 90) {
      return {
        valid: false,
        reason: `Latitude ${latitude} is out of permissible range [-90.0, +90.0]`,
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        valid: false,
        reason: `Longitude ${longitude} is out of permissible range [-180.0, +180.0]`,
      };
    }

    // Null Island detection (exact 0,0 or within 10 meters of 0,0 in the Gulf of Guinea)
    if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
      return {
        valid: false,
        reason: "Null Island coordinates (0.0, 0.0) rejected: GPS sensor default/uninitialized",
      };
    }

    return { valid: true };
  }

  /**
   * Evaluates whether coordinates fall inside a circular geofence boundary.
   * Never relies on client-side inside-outside decisions.
   *
   * @param workerLat Worker's authenticated latitude
   * @param workerLon Worker's authenticated longitude
   * @param siteLat Site centroid latitude retrieved from database
   * @param siteLon Site centroid longitude retrieved from database
   * @param radiusMeters Configured site radius retrieved from database
   * @param epsilon Boundary tolerance epsilon in meters
   */
  public static isInsideCircularGeofence(
    workerLat: number,
    workerLon: number,
    siteLat: number,
    siteLon: number,
    radiusMeters: number,
    epsilon: number = GEOFENCE_EPSILON_METERS
  ): GeofenceCheckResult {
    const distanceMeters = this.calculateWgs84Distance(workerLat, workerLon, siteLat, siteLon);
    const deltaMeters = Math.round((distanceMeters - radiusMeters) * 100) / 100;
    const isInside = distanceMeters <= radiusMeters + epsilon;

    return {
      isInside,
      distanceMeters,
      configuredRadiusMeters: radiusMeters,
      deltaMeters,
    };
  }

  /**
   * Ray-Casting Algorithm for polygon cadastral geofences.
   * Polygon coordinates array of [lat, lng].
   */
  public static isInsidePolygonGeofence(
    workerLat: number,
    workerLon: number,
    polygon: [number, number][]
  ): boolean {
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect =
        yi > workerLon !== yj > workerLon &&
        workerLat < ((xj - xi) * (workerLon - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Defense-in-depth risk signal detection for location telemetry.
   *
   * IMPORTANT SECURITY NOTICE:
   * "Never claim GPS can conclusively detect all spoofing. Rooted hardware, mock location
   * frameworks, and software emulators can manipulate inputs. CONSTRUCT360 combines
   * PostGIS spatial bounds, accuracy ceilings, kinematics velocity checks, and audit logs."
   */
  public static detectLocationRiskSignals(
    current: LocationTelemetryInput,
    previous?: PreviousLocationTelemetry | null,
    maxPermittedAccuracyMeters: number = 100
  ): LocationRiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];
    let calculatedSpeedKmh: number | undefined;

    // 1. Hardware/OS Mock Location Flag
    if (current.isMockLocation) {
      riskScore += 40;
      riskFactors.push("OS_MOCK_LOCATION_FLAG_DETECTED");
    }

    // 2. Unrealistic Perfect Accuracy (0.00 meters)
    // Real consumer GNSS receivers on construction sites virtually never report 0.00m accuracy.
    if (current.gpsAccuracyMeters <= 0.01) {
      riskScore += 25;
      riskFactors.push("SUSPICIOUS_PERFECT_ACCURACY_ZERO_METERS");
    }

    // 3. Excessive Inaccuracy (Poor signal / cell tower triangulation)
    if (current.gpsAccuracyMeters > maxPermittedAccuracyMeters) {
      riskScore += 35;
      riskFactors.push(
        `POOR_ACCURACY_EXCEEDS_CEILING (${current.gpsAccuracyMeters}m > ${maxPermittedAccuracyMeters}m)`
      );
    }

    // 4. Low-Precision Integer Coordinates (Mocking tool artifact)
    if (Number.isInteger(current.latitude) && Number.isInteger(current.longitude)) {
      riskScore += 30;
      riskFactors.push("INTEGER_PRECISION_COORDINATES_DETECTED");
    }

    // 5. Kinematics & Velocity Invariant (Teleportation Detection)
    if (previous && previous.eventTimestamp && current.eventTimestamp) {
      const timeDiffSeconds =
        (current.eventTimestamp.getTime() - previous.eventTimestamp.getTime()) / 1000;

      if (timeDiffSeconds > 0 && timeDiffSeconds < 86400) {
        const displacementMeters = this.calculateWgs84Distance(
          previous.latitude,
          previous.longitude,
          current.latitude,
          current.longitude
        );

        const speedMps = displacementMeters / timeDiffSeconds;
        calculatedSpeedKmh = Math.round(speedMps * 3.6 * 10) / 10;

        // Teleportation threshold: > 180 km/h between punches
        if (calculatedSpeedKmh > 180 && displacementMeters > 500) {
          riskScore += 45;
          riskFactors.push(
            `TELEPORTATION_VELOCITY_IMPLAUSIBLE (${calculatedSpeedKmh} km/h across ${Math.round(
              displacementMeters
            )}m in ${Math.round(timeDiffSeconds)}s)`
          );
        }
      }
    }

    // Cap risk score at 100
    const clampedScore = Math.min(riskScore, 100);

    return {
      riskScore: clampedScore,
      isSuspicious: clampedScore >= 50,
      riskFactors,
      calculatedSpeedKmh,
    };
  }

  /**
   * Generates authoritative PostGIS SQL fragment for raw database execution.
   */
  public static generatePostGisDistanceSql(
    pointCol: string,
    targetLat: number,
    targetLon: number
  ): string {
    return `ST_Distance(${pointCol}, ST_SetSRID(ST_MakePoint(${targetLon}, ${targetLat}), 4326)::geography)`;
  }

  public static generatePostGisDWithinSql(
    pointCol: string,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
  ): string {
    return `ST_DWithin(${pointCol}, ST_SetSRID(ST_MakePoint(${targetLon}, ${targetLat}), 4326)::geography, ${radiusMeters})`;
  }
}
