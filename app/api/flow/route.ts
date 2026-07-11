import { NextResponse } from "next/server";

/**
 * Server-side proxy for the Rhine gauge: same-origin for the browser (no
 * CORS surprises), cached for 5 minutes on Vercel, and it enriches the
 * reading with water temperature when a temperature dataset responds.
 *
 * Flow/level: data.bs.ch dataset 100089 (BAFU station Rheinhalle, 2289) —
 * columns timestamp / pegel / abfluss. Temperature: candidate datasets are
 * probed defensively; whichever yields a plausible °C wins.
 */
export const revalidate = 300;

const RECORDS = (dataset: string) =>
  `https://data.bs.ch/api/explore/v2.1/catalog/datasets/${dataset}/records?order_by=timestamp%20desc&limit=1`;

const TEMP_DATASETS = ["100046", "100069", "100254"];

async function latestRecord(dataset: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(RECORDS(dataset), {
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.results?.[0] as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const record = await latestRecord("100089");
  if (!record) {
    return NextResponse.json({ error: "gauge unreachable" }, { status: 502 });
  }

  let discharge =
    typeof record.abfluss === "number" ? record.abfluss : null;
  let levelM = typeof record.pegel === "number" ? record.pegel : null;
  let tempC: number | null = null;

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "number") continue;
    if (discharge === null && /abfluss|durchfluss|flow/i.test(key)) discharge = value;
    else if (levelM === null && /pegel|wasserstand|level/i.test(key)) levelM = value;
    else if (tempC === null && /temperatur|temp/i.test(key) && value > 0 && value < 35)
      tempC = value;
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

  let timestamp =
    typeof record.timestamp === "string" ? record.timestamp : null;
  if (!timestamp) {
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && /time|zeit|date/i.test(key)) {
        timestamp = value;
        break;
      }
    }
  }

  if (tempC === null) {
    for (const ds of TEMP_DATASETS) {
      const r = await latestRecord(ds);
      if (!r) continue;
      for (const [key, value] of Object.entries(r)) {
        if (
          typeof value === "number" &&
          /temperatur|temp/i.test(key) &&
          value > 0 &&
          value < 35
        ) {
          tempC = value;
          break;
        }
      }
      if (tempC !== null) break;
    }
  }

  return NextResponse.json({ dischargeM3s: discharge, levelM, tempC, timestamp });
}
