/**
 * Intensity model + calorie estimate.
 *
 * The slider declares HOW you swam; each level maps to a typical stroke
 * speed through the water and an active share of the time (duty):
 *
 *   1 FLOAT   — no swimming: 0 m/s, treading only.
 *   2 PAUSES  — swimming with pauses: ~45% of the time at a relaxed 0.6 m/s.
 *   3 STEADY  — continuous swimming at an average 0.75 m/s.
 *   4 STRONG  — continuous, faster strokes than average: 0.95 m/s.
 *
 * In LOG mode these assumptions produce your share of the distance
 * (v × duty × time) — so pushing the slider right genuinely moves meters
 * from the Rhy's column into yours. The river's share is what's deduced.
 * In GPX mode the average swim speed comes out of the data instead, and
 * duty reconstructs the speed while actively swimming.
 *
 * Calories: MET = 2.5 + 7.2 · v_active² · duty (drag work at stroke speed
 * for the active share, treading for the rest), kcal = MET × kg × h, with
 * a small body-composition factor (~-8% F). Anchors follow the Compendium
 * of Physical Activities (treading 2.5, ~0.7 m/s ≈ 6, ~1.0 m/s ≈ 9.7).
 *
 * SIMPLIFICATION: no heart rate, no cold-water thermogenesis. Order of
 * magnitude, same as watches without HR.
 */
const BASE_MET = 2.5;
const DRAG_MET_COEFF = 7.2;
const MAX_MET = 14;

export interface IntensityLevel {
  /** Typical stroke speed through the water while swimming, m/s. */
  strokeMs: number;
  /** Share of elapsed time spent actively swimming. */
  duty: number;
  label: string;
}

export const INTENSITY: Record<number, IntensityLevel> = {
  1: { strokeMs: 0, duty: 0, label: "Float" },
  2: { strokeMs: 0.6, duty: 0.45, label: "Pauses" },
  3: { strokeMs: 0.75, duty: 1, label: "Steady" },
  4: { strokeMs: 0.95, duty: 1, label: "Strong" },
};

export const clampLevel = (l: number) => Math.min(4, Math.max(1, Math.round(l)));

export type Sex = "f" | "m" | "u";
const SEX_FACTOR: Record<Sex, number> = { f: 0.92, m: 1.0, u: 1.0 };

export function estimateKcal(
  activeSwimSpeedMs: number,
  duty: number,
  elapsedSeconds: number,
  weightKg: number,
  sex: Sex = "u"
): number {
  const hours = elapsedSeconds / 3600;
  const met = Math.min(
    MAX_MET,
    BASE_MET + DRAG_MET_COEFF * activeSwimSpeedMs ** 2 * duty
  );
  return met * weightKg * hours * (SEX_FACTOR[sex] ?? 1);
}

export const DEFAULT_WEIGHT_KG = 75;
