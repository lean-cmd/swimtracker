/**
 * Hydrology for the Basel Rhine.
 *
 * Live data: Basel-Stadt open data portal (OpenDataSoft),
 * dataset 100089 — "Rhein Wasserstand, Pegel und Abfluss", ~5-minute values
 * measured at the BAFU station Rhein–Basel, Rheinhalle (station 2289).
 *   Records API (small, latest-first):
 *   https://data.bs.ch/api/explore/v2.1/catalog/datasets/100089/records
 *   Full JSON export (whole dataset — avoid in the browser):
 *   https://data.bs.ch/api/v2/catalog/datasets/100089/exports/json
 *
 * Later: dataset 100271 "Vorhersagen Rhein: Wasserstand und Abfluss" for a
 * "should I swim today?" forecast.
 *
 * The portal allows cross-origin requests, so the fetch below runs directly
 * in the swimmer's browser — no backend needed.
 */

/**
 * Where in the river the swimmer was — current varies a lot across the
 * channel (bank friction, eddies, the outside of the bend runs faster).
 * Factors are multipliers on the *midstream* surface current.
 *
 * SIMPLIFICATION: rough empirical ranges, not measured profiles. The
 * Kleinbasel bank is the inside of the city bend (slowest); the Grossbasel
 * side sits toward the outside of the bend (a bit faster near the bank).
 */
export interface SwimPosition {
  id: string;
  label: string;
  factor: number;
}

export const SWIM_POSITIONS: SwimPosition[] = [
  { id: "kleinbasel", label: "Near the Kleinbasel shore", factor: 0.65 },
  { id: "grossbasel", label: "Near the Grossbasel shore", factor: 0.75 },
  { id: "corridor", label: "In the usual swim lane", factor: 0.85 },
  { id: "middle", label: "In the middle of the river", factor: 1.0 },
];

/**
 * Fixed factor for the usual Basel swim lane (a bit off the Kleinbasel
 * shore). We deliberately don't ask where people swam: you should stay on
 * one side anyway, and being ~15 m closer to the shore or the middle only
 * shifts the current by roughly ±15% — within this model's error bars.
 */
export const SWIM_LANE_FACTOR = 0.85;

/** Plain-language description of the current for the status line. */
export function describeCurrent(ms: number): string {
  if (ms < 0.8) return "gentle";
  if (ms < 1.5) return "medium";
  return "strong";
}

/**
 * Discharge (m³/s) → estimated midstream surface velocity (m/s) at Basel.
 *
 * Piecewise-linear over an empirical lookup:
 *   Q < 500     → ~0.8
 *   500–700     → ~1.0–1.2
 *   700–900     → ~1.2–1.4
 *   900–1100    → ~1.4–1.6
 *   1100–1400   → ~1.6–1.9
 *   > 1400      → extrapolated, low confidence (and the canton says don't
 *                 swim above 1500 m³/s anyway)
 *
 * SIMPLIFICATION: discharge is total river volume, not point velocity — a
 * proper version would calibrate against cross-section/ADCP measurements or
 * repeated swims of known routes.
 */
const Q_TO_V: Array<[number, number]> = [
  [450, 0.8],
  [500, 1.0],
  [700, 1.2],
  [900, 1.4],
  [1100, 1.6],
  [1400, 1.9],
];

export function midstreamCurrentFromDischarge(dischargeM3s: number): number {
  const q = dischargeM3s;
  if (q <= Q_TO_V[0][0]) return Q_TO_V[0][1];
  for (let i = 1; i < Q_TO_V.length; i++) {
    const [q1, v1] = Q_TO_V[i - 1];
    const [q2, v2] = Q_TO_V[i];
    if (q <= q2) return v1 + ((q - q1) / (q2 - q1)) * (v2 - v1);
  }
  // Above 1400: extend the last segment's slope, capped at 3 m/s.
  const [q1, v1] = Q_TO_V[Q_TO_V.length - 2];
  const [q2, v2] = Q_TO_V[Q_TO_V.length - 1];
  return Math.min(3, v2 + ((q - q2) * (v2 - v1)) / (q2 - q1));
}

/** Model confidence drops above this discharge (and swimming is discouraged). */
export const HIGH_FLOW_M3S = 1400;
/** Official canton guidance: don't swim above this discharge. */
export const FLOW_WARNING_M3S = 1500;

/**
 * Approximate long-term monthly mean discharge (m³/s) for the Rhine at
 * Basel, index 0 = January. Snowmelt peaks in early summer, autumn runs low.
 *
 * SIMPLIFICATION: rounded climatology values for the Rheinhalle station —
 * good enough as a last-resort default so the average user never has to
 * type a flow. A better version would compute real monthly means from the
 * dataset 100089 history (or ship BAFU's published statistics).
 */
export const SEASONAL_Q_BY_MONTH: number[] = [
  1050, // Jan
  1030, // Feb
  1090, // Mar
  1160, // Apr
  1310, // May
  1450, // Jun
  1350, // Jul
  1200, // Aug
  1000, // Sep
  950, // Oct
  980, // Nov
  1050, // Dec
];

export const seasonalDischarge = (date: Date): number =>
  SEASONAL_Q_BY_MONTH[date.getMonth()];

/** Last successful live reading, cached so offline visits still get a real value. */
const CACHE_KEY = "currentcorrector.lastFlow";
/** Cached readings older than this fall back to the seasonal average. */
const CACHE_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export interface CachedFlow {
  dischargeM3s: number;
  fetchedAt: number; // epoch ms
  timestamp: string | null; // measurement time as reported by the API
}

export function saveCachedFlow(flow: LiveFlow): void {
  try {
    const entry: CachedFlow = {
      dischargeM3s: flow.dischargeM3s,
      fetchedAt: Date.now(),
      timestamp: flow.timestamp,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // storage unavailable (private mode etc.) — the seasonal fallback covers it
  }
}

export function loadCachedFlow(): CachedFlow | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedFlow;
    if (
      typeof entry.dischargeM3s !== "number" ||
      typeof entry.fetchedAt !== "number" ||
      Date.now() - entry.fetchedAt > CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export interface LiveFlow {
  dischargeM3s: number;
  levelM: number | null;
  timestamp: string | null;
}

const DATA_BS_URL =
  "https://data.bs.ch/api/explore/v2.1/catalog/datasets/100089/records?order_by=timestamp%20DESC&limit=1";

/**
 * Fetch the latest Rhine discharge from data.bs.ch (runs in the browser).
 *
 * Parsing is defensive: we look for a discharge-like key first
 * ("abfluss…"/"flow"/"durchfluss"), then fall back to any numeric value in a
 * plausible discharge range (Rhine at Basel stays within ~300–6000 m³/s).
 * TODO: pin the exact field names once verified against the live API
 * (the dev sandbox couldn't reach data.bs.ch).
 */
export async function fetchLiveFlow(): Promise<LiveFlow> {
  const res = await fetch(DATA_BS_URL);
  if (!res.ok) throw new Error(`data.bs.ch responded ${res.status}`);
  const data = await res.json();
  const record: Record<string, unknown> | undefined = data?.results?.[0];
  if (!record) throw new Error("No records returned from data.bs.ch");

  let discharge: number | null = null;
  let levelM: number | null = null;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "number") continue;
    if (discharge === null && /abfluss|durchfluss|flow/i.test(key)) {
      discharge = value;
    } else if (levelM === null && /pegel|wasserstand|level/i.test(key)) {
      levelM = value;
    }
  }
  if (discharge === null) {
    for (const value of Object.values(record)) {
      if (typeof value === "number" && value >= 300 && value <= 6000) {
        discharge = value;
        break;
      }
    }
  }
  if (discharge === null) {
    throw new Error("Could not find a discharge field in the response");
  }

  let timestamp: string | null = null;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && /time|zeit|date/i.test(key)) {
      timestamp = value;
      break;
    }
  }

  return { dischargeM3s: discharge, levelM, timestamp };
}
