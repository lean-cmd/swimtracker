import type { TrackPoint } from "@/lib/types";

/**
 * Dependency-free SVG preview of the swim track.
 * Equirectangular projection scaled by cos(latitude) — fine at city scale.
 * (A later version could render real map tiles with Leaflet/MapLibre.)
 */
export default function RouteMap({ points }: { points: TrackPoint[] }) {
  if (points.length < 2) return null;

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const midLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos((midLat * Math.PI) / 180);

  const W = 640;
  const H = 320;
  const PAD = 24;
  const spanX = Math.max((maxLon - minLon) * lonScale, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;

  const project = (p: TrackPoint) => ({
    x: offX + (p.lon - minLon) * lonScale * scale,
    y: H - offY - (p.lat - minLat) * scale, // flip: north = up
  });

  const path = points
    .map((p, i) => {
      const { x, y } = project(p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const start = project(points[0]);
  const end = project(points[points.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl border border-slate-700 bg-slate-900"
      role="img"
      aria-label="Swim route preview"
    >
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start.x} cy={start.y} r={6} fill="#4ade80" />
      <circle cx={end.x} cy={end.y} r={6} fill="#f87171" />
      <text x={start.x + 10} y={start.y + 4} fill="#4ade80" fontSize={13}>Entry</text>
      <text x={end.x + 10} y={end.y + 4} fill="#f87171" fontSize={13}>Exit</text>
    </svg>
  );
}
