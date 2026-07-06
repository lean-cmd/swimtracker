"use client";

import { BASEL_SPOTS, RECOMMENDED_FROM, spotIndex } from "@/lib/rivers";

/**
 * Tappable schematic map of the Basel Rhine swim stretch, colored after the
 * canton's official zone map:
 *   teal  = recommended swimming area (Schwarzwaldbrücke → Dreirosenbrücke)
 *   red   = danger zone (upstream stretch toward the Birsfelden lock)
 *   striped = prohibited harbour area (below Dreirosenbrücke)
 * Dependency-free SVG; spots are numbered with a legend below — full names
 * on the map itself collide at phone sizes.
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
  const PAD = 46;
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

  // Smooth path through a sub-chain of points via quadratic midpoint curves.
  const smoothPath = (sub: { x: number; y: number }[]) => {
    let d = `M${sub[0].x},${sub[0].y}`;
    for (let i = 1; i < sub.length - 1; i++) {
      const mx = (sub[i].x + sub[i + 1].x) / 2;
      const my = (sub[i].y + sub[i + 1].y) / 2;
      d += ` Q${sub[i].x},${sub[i].y} ${mx},${my}`;
    }
    d += ` L${sub[sub.length - 1].x},${sub[sub.length - 1].y}`;
    return d;
  };

  const dangerPath = smoothPath(pts.slice(0, RECOMMENDED_FROM + 1));
  const recommendedPath = smoothPath(pts.slice(RECOMMENDED_FROM));

  // Harbour stub: continue past the last spot in the same direction.
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  const harbour = { x: last.x + (dx / len) * 52, y: last.y + (dy / len) * 52 };

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
        {/* danger zone upstream of the recommended corridor */}
        <path d={dangerPath} fill="none" stroke="#7f1d1d" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
        <path d={dangerPath} fill="none" stroke="#ef4444" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        {/* recommended swimming area */}
        <path d={recommendedPath} fill="none" stroke="#134e4a" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
        <path d={recommendedPath} fill="none" stroke="#14b8a6" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        {/* prohibited harbour below Dreirosenbrücke */}
        <line
          x1={last.x}
          y1={last.y}
          x2={harbour.x}
          y2={harbour.y}
          stroke="#f59e0b"
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray="7 7"
          opacity={0.8}
        />
        <text x={harbour.x + 6} y={harbour.y + 20} fill="#f59e0b" fontSize={12} fontWeight={600}>
          ⚓ harbour
        </text>

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

      {/* zone key, mirroring the official canton map */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-teal-500/70" /> recommended
          swimming area
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-red-500/60" /> danger zone
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border border-dashed border-amber-400 bg-amber-400/30" />{" "}
          harbour — swimming prohibited
        </span>
      </div>

      {/* legend */}
      <ol className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
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
                {s.outsideRecommended ? " ⚠️" : ""}
                {isEntry ? " — entry" : isExit ? " — exit" : ""}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
