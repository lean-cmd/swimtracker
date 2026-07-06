"use client";

import { BASEL_SPOTS, spotIndex } from "@/lib/rivers";

/**
 * Tappable schematic map of the Basel Rhine swim stretch.
 * The river band is drawn through the spot chain (upstream → downstream);
 * dependency-free SVG, same city-scale projection as RouteMap.
 * Spots are numbered on the map with a legend below — full names on the
 * map itself collide at phone sizes.
 */
export default function BaselMap({
  entryId,
  exitId,
  onPick,
}: {
  entryId: string | null;
  exitId: string | null;
  onPick: (spotId: string) => void;
}) {
  const lats = BASEL_SPOTS.map((s) => s.lat);
  const lons = BASEL_SPOTS.map((s) => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const lonScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));

  const W = 640;
  const H = 340;
  const PAD = 36;
  const spanX = (maxLon - minLon) * lonScale;
  const spanY = maxLat - minLat;
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;

  const project = (lat: number, lon: number) => ({
    x: offX + (lon - minLon) * lonScale * scale,
    y: H - offY - (lat - minLat) * scale,
  });

  const pts = BASEL_SPOTS.map((s) => project(s.lat, s.lon));
  // Smooth river band through the spots via quadratic midpoint curves.
  let river = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    river += ` Q${pts[i].x},${pts[i].y} ${mx},${my}`;
  }
  river += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;

  const entryIdx = entryId ? spotIndex(entryId) : -1;
  const exitIdx = exitId ? spotIndex(exitId) : -1;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-slate-700 bg-slate-900"
        role="img"
        aria-label="Basel Rhine map with entry and exit spots"
      >
        {/* river */}
        <path d={river} fill="none" stroke="#1e3a5f" strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" />
        <path d={river} fill="none" stroke="#2563eb" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
        {/* selected stretch */}
        {entryIdx >= 0 && exitIdx >= 0 && entryIdx !== exitIdx && (
          <polyline
            points={pts
              .slice(Math.min(entryIdx, exitIdx), Math.max(entryIdx, exitIdx) + 1)
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <text x={12} y={H - 12} fill="#64748b" fontSize={13}>
          flow: 1 Birskopf (upstream) → 9 Dreirosen (last exit)
        </text>

        {BASEL_SPOTS.map((s, i) => {
          const p = pts[i];
          const isEntry = s.id === entryId;
          const isExit = s.id === exitId;
          const fill = isEntry ? "#4ade80" : isExit ? "#f87171" : s.popular ? "#e2e8f0" : "#64748b";
          return (
            <g
              key={s.id}
              onClick={() => onPick(s.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${s.name}${isEntry ? " (entry)" : isExit ? " (exit)" : ""}`}
            >
              {/* generous invisible hit area for thumbs */}
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={isEntry || isExit ? 13 : 11}
                fill={fill}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={p.y + 4.5}
                textAnchor="middle"
                fill="#0f172a"
                fontSize={13}
                fontWeight={700}
                pointerEvents="none"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <ol className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
        {BASEL_SPOTS.map((s, i) => {
          const isEntry = s.id === entryId;
          const isExit = s.id === exitId;
          return (
            <li key={s.id}>
              <button
                onClick={() => onPick(s.id)}
                className={`w-full rounded px-1.5 py-0.5 text-left ${
                  isEntry
                    ? "bg-green-500/15 font-medium text-green-300"
                    : isExit
                      ? "bg-red-500/15 font-medium text-red-300"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {i + 1}. {s.popular ? "★ " : ""}
                {s.name}
                {isEntry ? " — entry" : isExit ? " — exit" : ""}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
