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
 * The app is Basel-first: one real preset plus a free-form fallback.
 *
 * SIMPLIFICATION: the default assumes a typical summer flow (~850 m³/s
 * → ≈1.1 m/s on the swim line, see lib/hydro.ts), but the real value swings
 * roughly 0.8–2.6 m/s with discharge — always set today's flow when you
 * know it (BachApp / data.bs.ch).
 */
export const RIVER_PRESETS: RiverPreset[] = [
  {
    id: "basel-rhine",
    name: "Rhine — Basel",
    defaultCurrentMs: 1.1,
    description:
      "City stretch from Birskopf down to Dreirosenbrücke. Default assumes a typical summer flow — set today's flow rate below, it changes every day.",
  },
  {
    id: "custom",
    name: "Custom river",
    defaultCurrentMs: 1.0,
    description: "No preset — set the current speed yourself.",
  },
];

/**
 * Basel Rhine entry/exit spots, ordered upstream → downstream.
 *
 * Coordinates are approximate positions on the swim line and the chain of
 * straight hops between them approximates the swim distance.
 * SIMPLIFICATION: a real version would measure along the river centerline
 * (OpenStreetMap waterway geometry) and use the exact marked exit stairs
 * from the canton's Rhine page (bs.ch → Parks und Rhein → Rhein).
 * Swimmers must leave the water at Dreirosenbrücke at the latest — the
 * harbor/shipping area starts below it.
 */
export interface RiverSpot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Marks the classic, most-used spots for quick picking. */
  popular?: boolean;
}

export const BASEL_SPOTS: RiverSpot[] = [
  { id: "birskopf", name: "Birskopf", lat: 47.5519, lon: 7.6247, popular: true },
  { id: "breite", name: "Rheinbad Breite (St. Alban)", lat: 47.554, lon: 7.6155, popular: true },
  { id: "schwarzwaldbruecke", name: "Schwarzwaldbrücke", lat: 47.5551, lon: 7.6123 },
  { id: "tinguely", name: "Museum Tinguely / Solitude", lat: 47.5571, lon: 7.6056, popular: true },
  { id: "wettsteinbruecke", name: "Wettsteinbrücke", lat: 47.5578, lon: 7.5962 },
  { id: "mittlere-bruecke", name: "Mittlere Brücke", lat: 47.5605, lon: 7.5906 },
  { id: "kaserne", name: "Kaserne / Klingental", lat: 47.5622, lon: 7.5882 },
  { id: "johanniterbruecke", name: "Johanniterbrücke", lat: 47.5648, lon: 7.5851 },
  { id: "dreirosen", name: "Dreirosenbrücke (last exit!)", lat: 47.5688, lon: 7.5788, popular: true },
];

export const spotIndex = (id: string) =>
  BASEL_SPOTS.findIndex((s) => s.id === id);

/**
 * Approximate swim distance between two spots: straight-line hops along the
 * ordered spot chain.
 */
export function distanceBetweenSpots(fromId: string, toId: string): number {
  const from = spotIndex(fromId);
  const to = spotIndex(toId);
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
