/**
 * Calorie estimate for river swims — drag-based, not tier-based.
 *
 * kcal = MET × body weight (kg) × hours, with MET rising with the SQUARE of
 * the swimmer's speed through the water (hydrodynamic drag work), plus a
 * resting/treading baseline:
 *
 *   MET(v) = 2.5 + 7.2 · v² · efficiency(effort)
 *
 * Anchored to the Compendium of Physical Activities: v≈0 treading → 2.5,
 * v≈0.7 m/s steady → ≈6, v≈1.0 m/s brisk → ≈9.7. Because the v² term grows
 * faster than time shrinks, swimming the same route FASTER now yields MORE
 * calories (above ~0.6 m/s), which matches intuition — the old tier model
 * had it backwards.
 *
 * The 4-point effort scale declares perceived exertion: FLOAT (1) pins the
 * baseline; EASY/STEADY/HARD scale efficiency ±~10% — fighting the water at
 * the same speed costs more than gliding.
 *
 * SIMPLIFICATION: no heart rate, no cold-water thermogenesis (real in the
 * ~18–24 °C Rhine). A rough order of magnitude, same as watches without HR.
 */
const BASE_MET = 2.5;
const DRAG_MET_COEFF = 7.2;
const MAX_MET = 14;
const EFFORT_EFFICIENCY = [0.9, 1.0, 1.15]; // easy, steady, hard

export function estimateKcal(
  swimmerSpeedMs: number,
  elapsedSeconds: number,
  weightKg: number,
  effortLevel: number // 1 float … 4 hard
): number {
  const hours = elapsedSeconds / 3600;
  if (effortLevel <= 1) return BASE_MET * weightKg * hours;
  const eff =
    EFFORT_EFFICIENCY[
      Math.min(EFFORT_EFFICIENCY.length - 1, Math.max(0, effortLevel - 2))
    ];
  const met = Math.min(
    MAX_MET,
    BASE_MET + DRAG_MET_COEFF * swimmerSpeedMs ** 2 * eff
  );
  return met * weightKg * hours;
}

export const DEFAULT_WEIGHT_KG = 75;
