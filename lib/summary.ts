import type { CorrectionResult } from "./types";
import { formatDistance, formatDuration, formatPace } from "./format";

/**
 * Share text with some Rhy in it — short, braggable, pasteable into a
 * Strava description or a group chat.
 */
export function buildStravaSummary(
  result: CorrectionResult,
  riverName: string,
  kcal: number,
  label?: string,
  race?: { vActive: number; gaugeLaneMs: number }
): string {
  const lines: string[] = [`\u{1F30A} Rhyschwumm${label ? ` \u00B7 ${label}` : ""}`];

  if (result.floating) {
    lines.push(
      `\u{1F6DF} Full-service float: the Rhy carried me ${formatDistance(result.gpsDistanceMeters)} in ${formatDuration(result.elapsedSeconds)}.`,
      `\u{1F525} ${Math.round(kcal)} kcal (yes, floating counts a bit)`
    );
  } else {
    lines.push(
      `\u{1F3CA} Me: ${formatDistance(result.swimmerDistanceMeters)} \u00B7 \u{1F30A} Rhy: ${formatDistance(result.currentDistanceMeters)} (${result.currentBoostPercent.toFixed(0)}%)`,
      `\u23F1 ${formatDuration(result.elapsedSeconds)} \u00B7 \u{1F525} ${Math.round(kcal)} kcal${
        result.stillWaterPaceSecPer100m
          ? ` \u00B7 pool pace ${formatPace(result.stillWaterPaceSecPer100m)}`
          : ""
      }`
    );
    if (race && race.gaugeLaneMs > 0.05) {
      lines.push(
        race.vActive >= race.gaugeLaneMs
          ? `\u{1F3C6} Out-swam the Rhy (${race.vActive.toFixed(1)} vs ${race.gaugeLaneMs.toFixed(1)} m/s)!`
          : `\u{1F3C1} Rhy wins today \u2014 I held ${Math.round((race.vActive / race.gaugeLaneMs) * 100)}% of its ${(race.gaugeLaneMs * 3.6).toFixed(1)} km/h`
      );
    }
  }

  lines.push(`\u2014 rhyschwumm, made in Basel \u{1F1E8}\u{1F1ED}`);
  return lines.join("\n");
}
