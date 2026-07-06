import { haversineMeters } from "./geo";

/** A river preset with a default current model. */
export interface RiverPreset {
  id: string;
  name: string;
  /** Default downstream surface current in m/s. */
  defaultCurrentMs: number;
  description: string;
}

/**
 * MVP ships with the Basel Rhine only.
 *
 * SIMPLIFICATION: 1.5 m/s is a typical mid-summer surface speed in the
 * Basel city stretch, but the real value swings roughly 1–2.5 m/s with
 * discharge. Later this preset could fetch live discharge from the BAFU
 * hydrology API (station 2289, Rhein–Basel Rheinhalle) and derive speed
 * from a rating curve instead of a constant.
 */
export const RIVER_PRESETS: RiverPreset[] = [
  {
    id: "basel-rhine",
    name: "Rhine — Basel",
    defaultCurrentMs: 1.5,
    description:
      "City stretch from Schwarzwaldbrücke to Dreirosenbrücke. Default 1.5 m/s; adjust for the day's discharge.",
  },
  {
    id: "custom",
    name: "Custom river",
    defaultCurrentMs: 1.0,
    description: "No preset — set the current speed yourself.",
  },
];

/**
 * Popular Basel Rhine entry/exit spots, ordered upstream → downstream.
 * Coordinates are approximate river-bank positions; distances between spots
 * are summed along this chain as a rough proxy for the swim line.
 */
export interface RiverSpot {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export const BASEL_SPOTS: RiverSpot[] = [
  { id: "schwarzwaldbruecke", name: "Schwarzwaldbrücke", lat: 47.5537, lon: 7.6103 },
  { id: "wettsteinbruecke", name: "Wettsteinbrücke", lat: 47.5578, lon: 7.5962 },
  { id: "mittlere-bruecke", name: "Mittlere Brücke", lat: 47.5605, lon: 7.5906 },
  { id: "johanniterbruecke", name: "Johanniterbrücke", lat: 47.5648, lon: 7.5851 },
  { id: "dreirosenbruecke", name: "Dreirosenbrücke", lat: 47.5688, lon: 7.5788 },
];

/**
 * Approximate swim distance between two spots: straight-line hops along the
 * ordered spot chain. Good enough for the gently curving Basel stretch;
 * a real version would measure along the river centerline.
 */
export function distanceBetweenSpots(fromId: string, toId: string): number {
  const from = BASEL_SPOTS.findIndex((s) => s.id === fromId);
  const to = BASEL_SPOTS.findIndex((s) => s.id === toId);
  if (from === -1 || to === -1) return 0;
  const [a, b] = from < to ? [from, to] : [to, from];
  let d = 0;
  for (let i = a + 1; i <= b; i++) {
    d += haversineMeters(
      BASEL_SPOTS[i - 1].lat,
      BASEL_SPOTS[i - 1].lon,
      BASEL_SPOTS[i].lat,
      BASEL_SPOTS[i].lon
    );
  }
  return d;
}
