/**
 * Calorie estimate for river swims — drag work with an effort duty-cycle.
 *
 * The correction model derives the swimmer's AVERAGE speed through the
 * water (v). The intensity scale says how that average came about:
 *
 *   FLOAT   — no swimming at all: treading baseline only.
 *   EASY    — a mix: floating with stretches of swimming (~half the time).
 *             The swimming bursts must be faster than v to produce the same
 *             average, and drag grows with speed², so bursts cost more.
 *   STEADY  — continuous swimming at your average pace.
 *   HARD    — strong continuous swimming; technique/efficiency drops a bit.
 *
 * MET = 2.5 + 7.2 · v²/duty (capped), kcal = MET × weight × hours, with a
 * small body-composition factor by sex (lean-mass share drives resting and
 * active burn; ~-8% for female, neutral default).
 * Anchors follow the Compendium of Physical Activities (treading 2.5,
 * ~0.7 m/s steady ≈ 6, ~1.0 m/s brisk ≈ 9.7).
 *
 * SIMPLIFICATION: no heart rate, no cold-water thermogenesis (real in the
 * ~18–24 °C Rhine). A rough order of magnitude, same as watches without HR.
 */
const BASE_MET = 2.5;
const DRAG_MET_COEFF = 7.2;
const MAX_MET = 14;

/** Active-swimming share of the elapsed time per intensity level (2–4). */
const DUTY: Record<number, number> = { 2: 0.5, 3: 1.0, 4: 1.0 };
/** HARD burns extra per meter — fighting the water is less efficient. */
const HARD_INEFFICIENCY = 1.15;

export type Sex = "f" | "m" | "u";
const SEX_FACTOR: Record<Sex, number> = { f: 0.92, m: 1.0, u: 1.0 };

export function estimateKcal(
  swimmerSpeedMs: number,
  elapsedSeconds: number,
  weightKg: number,
  effortLevel: number, // 1 float … 4 hard
  sex: Sex = "u"
): number {
  const hours = elapsedSeconds / 3600;
  const factor = SEX_FACTOR[sex] ?? 1;
  if (effortLevel <= 1) return BASE_MET * weightKg * hours * factor;
  const duty = DUTY[Math.min(4, Math.max(2, Math.round(effortLevel)))] ?? 1;
  const inefficiency = effortLevel >= 4 ? HARD_INEFFICIENCY : 1;
  const met = Math.min(
    MAX_MET,
    BASE_MET + (DRAG_MET_COEFF * swimmerSpeedMs ** 2 * inefficiency) / duty
  );
  return met * weightKg * hours * factor;
}

/**
 * Speed while ACTIVELY swimming, reconstructed from the average swimmer
 * speed and the intensity duty-cycle: EASY swims half the time (so bursts
 * run at 2× the average), STEADY is continuous at the average, HARD means
 * lightly accelerated bursts with micro-rests (~1.15×). This is what
 * "your speed in the water" and the pool-equivalent pace should show.
 */
export function activeSwimSpeed(
  avgSwimmerSpeedMs: number,
  effortLevel: number
): number {
  if (effortLevel <= 1) return 0;
  if (effortLevel === 2) return avgSwimmerSpeedMs / 0.5;
  if (effortLevel >= 4) return avgSwimmerSpeedMs * 1.15;
  return avgSwimmerSpeedMs;
}

export const DEFAULT_WEIGHT_KG = 75;
