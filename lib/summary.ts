import type { CorrectionResult } from "./types";
import { formatDistance, formatDuration, formatPace } from "./format";

/** Plain-text summary suitable for pasting into a Strava activity description. */
export function buildStravaSummary(
  result: CorrectionResult,
  riverName: string
): string {
  const lines = [
    `🌊 CurrentCorrector — ${riverName}`,
    ``,
    `GPS: ${formatDistance(result.gpsDistanceMeters)} in ${formatDuration(result.elapsedSeconds)} (${formatPace(result.gpsPaceSecPer100m)})`,
    `Current: ${result.effectiveCurrentMs.toFixed(2)} m/s along route → carried me ${formatDistance(result.currentDistanceMeters)} (${result.currentBoostPercent.toFixed(0)}% of the distance)`,
  ];
  if (result.floating) {
    lines.push(
      `Mostly drifting — the river did the work. Implied current ≈ ${result.impliedCurrentMs.toFixed(2)} m/s.`
    );
  } else {
    lines.push(
      `Swimmer effort: ${formatDistance(result.swimmerDistanceMeters)} through the water`,
      `Still-water equivalent pace: ${formatPace(result.stillWaterPaceSecPer100m!)}`
    );
  }
  lines.push(``, `(estimated with a simplified constant-current model)`);
  return lines.join("\n");
}
