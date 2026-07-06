/**
 * Calorie estimate for river swims.
 *
 * kcal = MET × body weight (kg) × hours, with the MET picked from the
 * swimmer's speed THROUGH THE WATER (not over ground — drifting with the
 * current is not exercise, no matter what the GPS pace says).
 *
 * MET anchors follow the Compendium of Physical Activities:
 * treading/floating ≈ 2.5, leisurely breaststroke ≈ 4.5, steady swimming
 * ≈ 6, brisk freestyle ≈ 8.3, fast freestyle ≈ 9.8.
 *
 * SIMPLIFICATION: no heart-rate data (Strava GPX sometimes embeds HR — a
 * later version could use it), and no cold-water thermogenesis, which is
 * real in the ~18–24 °C Rhine. Treat as a rough "order of magnitude", the
 * same way watches do.
 */
export function estimateKcal(
  swimmerSpeedMs: number,
  elapsedSeconds: number,
  weightKg: number
): number {
  let met: number;
  if (swimmerSpeedMs < 0.1) met = 2.5; // floating / gentle treading
  else if (swimmerSpeedMs < 0.4) met = 4.5; // easy breaststroke
  else if (swimmerSpeedMs < 0.7) met = 6.0; // steady swimming
  else if (swimmerSpeedMs < 1.0) met = 8.3; // brisk freestyle
  else met = 9.8; // fast freestyle
  return met * weightKg * (elapsedSeconds / 3600);
}

export const DEFAULT_WEIGHT_KG = 75;
