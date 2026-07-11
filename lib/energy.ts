/**
 * Calorie estimate for river swims.
 *
 * kcal = MET × body weight (kg) × hours, with the MET picked from the
 * swimmer's DECLARED effort (the 5-point slider), not from speed. In a river,
 * speed over ground says little about work done — the current does an unknown
 * share — and deriving MET from computed swim speed made a faster swim look
 * like fewer calories. Effort × time is what watches without HR do too.
 *
 * MET anchors follow the Compendium of Physical Activities:
 * 1 floated ≈ 2.5, 2 easy ≈ 4.5, 3 steady ≈ 6, 4 brisk ≈ 8.3, 5 race ≈ 9.8.
 *
 * SIMPLIFICATION: no heart-rate data (Strava GPX sometimes embeds HR — a
 * later version could use it), and no cold-water thermogenesis, which is
 * real in the ~18–24 °C Rhine. Treat as a rough "order of magnitude", the
 * same way watches do.
 */
export const EFFORT_MET = [2.5, 4.5, 6.0, 8.3, 9.8];

export function estimateKcal(
  effortLevel: number,
  elapsedSeconds: number,
  weightKg: number
): number {
  const met =
    EFFORT_MET[Math.min(EFFORT_MET.length - 1, Math.max(0, Math.round(effortLevel) - 1))];
  return met * weightKg * (elapsedSeconds / 3600);
}

export const DEFAULT_WEIGHT_KG = 75;
