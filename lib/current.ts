import type { CorrectionResult, SwimInput } from "./types";

/**
 * The MVP current-correction model.
 *
 * Model: over-ground speed = swimmer speed through water + current speed
 * projected onto the swim direction. Everything below is simple algebra on
 * averages over the whole swim.
 *
 * SIMPLIFICATIONS (each is a hook for real hydrological data later):
 *  - The current is a single constant speed for the whole swim. Real rivers
 *    vary with discharge (for the Basel Rhine, the BAFU gauge at
 *    Rheinhalle/Basel publishes live discharge in m³/s that could be mapped
 *    to surface speed), with distance from the bank, and with depth.
 *  - The current direction is assumed to follow the straight line between
 *    the first and last GPS points (see routeAlignment in lib/gpx.ts). A
 *    real model would follow the river centerline.
 *  - Averaging over the full swim hides intervals: sprinting under a bridge
 *    and floating past it come out the same. A segment-by-segment version
 *    of this same formula would fix that.
 */
export function correctForCurrent(
  input: SwimInput,
  currentSpeedMs: number
): CorrectionResult {
  const { distanceMeters, elapsedSeconds, routeAlignment } = input;

  const gpsSpeedMs = distanceMeters / elapsedSeconds;
  const effectiveCurrentMs = currentSpeedMs * routeAlignment;

  // Swimmer speed through water; clamped at 0 — if the configured current is
  // faster than the GPS speed, the model says the swimmer was drifting
  // (or the current setting is too high).
  const swimmerSpeedMs = Math.max(0, gpsSpeedMs - effectiveCurrentMs);
  const floating = swimmerSpeedMs < 0.05; // below ~3 m/min counts as drifting

  // Split the recorded distance into "river's share" and "swimmer's share".
  const currentDistanceMeters = Math.min(
    distanceMeters,
    effectiveCurrentMs * elapsedSeconds
  );
  const swimmerDistanceMeters = distanceMeters - currentDistanceMeters;

  return {
    gpsDistanceMeters: distanceMeters,
    elapsedSeconds,
    gpsSpeedMs,
    effectiveCurrentMs,
    currentDistanceMeters,
    swimmerDistanceMeters,
    swimmerSpeedMs,
    stillWaterPaceSecPer100m: floating ? null : 100 / swimmerSpeedMs,
    gpsPaceSecPer100m: 100 / gpsSpeedMs,
    currentBoostPercent: (currentDistanceMeters / distanceMeters) * 100,
    floating,
    impliedCurrentMs: gpsSpeedMs,
  };
}
