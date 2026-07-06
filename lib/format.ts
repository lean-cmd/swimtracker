/** Display formatting helpers. */

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Seconds per 100 m → "m:ss /100m". */
export function formatPace(secPer100m: number): string {
  const s = Math.round(secPer100m);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")} /100m`;
}

export function formatSpeed(ms: number): string {
  return `${ms.toFixed(2)} m/s (${(ms * 3.6).toFixed(1)} km/h)`;
}

export const msToKmh = (ms: number) => ms * 3.6;
export const kmhToMs = (kmh: number) => kmh / 3.6;
