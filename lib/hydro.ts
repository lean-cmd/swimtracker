/**
 * Hydrology helpers for the Basel Rhine.
 *
 * Live data source: Basel-Stadt open data portal (OpenDataSoft),
 * dataset 100246 — Rhine monitoring (flow/discharge, updated continuously):
 * https://data.bs.ch/explore/assets/100246/
 *
 * The portal's Explore API v2.1 allows cross-origin requests, so the fetch
 * below runs directly in the swimmer's browser — no backend needed.
 */

/** Where in the river the swimmer was — current varies across the channel. */
export interface SwimPosition {
  id: string;
  label: string;
  /**
   * Multiplier on the mid-channel-ish base current.
   * SIMPLIFICATION: real cross-channel velocity profiles depend on bathymetry
   * and discharge; these factors are rough rules of thumb (slower water near
   * the bank due to friction, fastest water toward the middle of the channel).
   */
  factor: number;
}

export const SWIM_POSITIONS: SwimPosition[] = [
  { id: "shore", label: "Close to shore", factor: 0.7 },
  { id: "typical", label: "Typical swim line", factor: 1.0 },
  { id: "middle", label: "Mid-river", factor: 1.15 },
];

/**
 * Map discharge (m³/s) at Basel to an approximate surface current speed (m/s)
 * on the usual swim line.
 *
 * SIMPLIFICATION: v = Q / A with an effective cross-section of ~1000 m²
 * (≈200 m wide × ≈5 m deep through the city stretch), times ~1.3 because
 * surface water moves faster than the section average. Sanity checks:
 *   ~600 m³/s (dry summer)  → ≈0.8 m/s
 *   ~1050 m³/s (annual mean) → ≈1.4 m/s
 *   ~2000 m³/s (high water)  → ≈2.6 m/s
 * which matches the commonly quoted 1–2.5 m/s range for the Basel stretch.
 * A proper version would use a stage–velocity rating curve calibrated
 * against the BAFU station 2289 measurements.
 */
export function currentFromDischarge(dischargeM3s: number): number {
  const EFFECTIVE_CROSS_SECTION_M2 = 1000;
  const SURFACE_FACTOR = 1.3;
  return (dischargeM3s / EFFECTIVE_CROSS_SECTION_M2) * SURFACE_FACTOR;
}

export interface LiveFlow {
  dischargeM3s: number;
  timestamp: string | null;
}

const DATA_BS_URL =
  "https://data.bs.ch/api/explore/v2.1/catalog/datasets/100246/records?order_by=timestamp%20DESC&limit=1";

/**
 * Fetch the latest Rhine discharge from data.bs.ch (runs in the browser).
 *
 * Parsing is defensive: field names on the portal aren't guaranteed stable,
 * so we look for a discharge-like key first ("abfluss…"/"flow"/"durchfluss"),
 * then fall back to any numeric value in a plausible discharge range
 * (Rhine at Basel stays within ~300–6000 m³/s).
 */
export async function fetchLiveFlow(): Promise<LiveFlow> {
  const res = await fetch(DATA_BS_URL);
  if (!res.ok) throw new Error(`data.bs.ch responded ${res.status}`);
  const data = await res.json();
  const record: Record<string, unknown> | undefined = data?.results?.[0];
  if (!record) throw new Error("No records returned from data.bs.ch");

  let discharge: number | null = null;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "number") continue;
    if (/abfluss|durchfluss|flow/i.test(key)) {
      discharge = value;
      break;
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

  return { dischargeM3s: discharge, timestamp };
}
