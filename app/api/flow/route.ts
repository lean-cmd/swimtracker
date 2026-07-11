import { NextResponse } from "next/server";

/**
 * Server-side proxy for the Rhine gauge: same-origin for the browser,
 * cached 5 minutes on Vercel, and enriched with water temperature.
 *
 * Flow/level: data.bs.ch dataset 100089 (BAFU station Rheinhalle, 2289).
 * Temperature: the portal's catalog is searched for a Rhine temperature
 * dataset (IDs drift, so discovery beats hardcoding), with the BAFU
 * hydrodaten JSON for station 2289 as a fallback.
 */
export const revalidate = 300;

const ODS = "https://data.bs.ch/api/explore/v2.1/catalog/datasets";
const UA = { "user-agent": "Rhyschwumm/1.0 (Basel swim tracker)" };

async function json(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", ...UA },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function latestRecord(dataset: string): Promise<Record<string, unknown> | null> {
  const withOrder = (await json(
    `${ODS}/${dataset}/records?order_by=timestamp%20desc&limit=1`
  )) as { results?: Record<string, unknown>[] } | null;
  if (withOrder?.results?.[0]) return withOrder.results[0];
  const plain = (await json(`${ODS}/${dataset}/records?limit=1`)) as {
    results?: Record<string, unknown>[];
  } | null;
  return plain?.results?.[0] ?? null;
}

const plausibleTemp = (v: unknown): v is number =>
  typeof v === "number" && v > 0 && v < 35;

function tempFromRecord(record: Record<string, unknown>): number | null {
  for (const [key, value] of Object.entries(record)) {
    if (/temperatur|wassertemp|temp_c|^temp$/i.test(key) && plausibleTemp(value)) {
      return value;
    }
  }
  return null;
}

/** Search the catalog for a Rhine water-temperature dataset. */
async function discoverTemp(): Promise<number | null> {
  for (const q of ["rhein wassertemperatur", "rhein temperatur"]) {
    const cat = (await json(
      `${ODS}?limit=6&search=${encodeURIComponent(q)}`
    )) as { results?: Array<{ dataset_id?: string }> } | null;
    for (const hit of cat?.results ?? []) {
      if (!hit.dataset_id) continue;
      const record = await latestRecord(hit.dataset_id);
      if (!record) continue;
      const t = tempFromRecord(record);
      if (t !== null) return t;
    }
  }
  return null;
}

/** BAFU hydrodaten fallback: deep-scan the plot JSON for the latest value. */
async function bafuTemp(): Promise<number | null> {
  const data = await json(
    "https://www.hydrodaten.admin.ch/plots/temperature_7days/2289_temperature_7days_de.json"
  );
  if (!data) return null;
  let last: number | null = null;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      // series like [ [ts, value], ... ] or plain numbers
      const tail = node[node.length - 1];
      if (plausibleTemp(tail)) last = tail;
      if (Array.isArray(tail) && plausibleTemp(tail[1])) last = tail[1];
    } else if (node && typeof node === "object") {
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(data);
  return last;
}

export async function GET() {
  const record = await latestRecord("100089");
  if (!record) {
    return NextResponse.json({ error: "gauge unreachable" }, { status: 502 });
  }

  let discharge = typeof record.abfluss === "number" ? record.abfluss : null;
  let levelM = typeof record.pegel === "number" ? record.pegel : null;
  let tempC = tempFromRecord(record);

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "number") continue;
    if (discharge === null && /abfluss|durchfluss|flow/i.test(key)) discharge = value;
    else if (levelM === null && /pegel|wasserstand|level/i.test(key)) levelM = value;
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
    return NextResponse.json({ error: "no discharge field" }, { status: 502 });
  }

  let timestamp = typeof record.timestamp === "string" ? record.timestamp : null;
  if (!timestamp) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && /time|zeit|date/i.test(key)) {
        timestamp = value;
        break;
      }
    }
  }

  if (tempC === null) tempC = await discoverTemp();
  if (tempC === null) tempC = await bafuTemp();

  return NextResponse.json({ dischargeM3s: discharge, levelM, tempC, timestamp });
}
