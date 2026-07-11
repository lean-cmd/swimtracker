"use client";

import { CORRIDOR_SPOTS } from "@/lib/rivers";
import { FLOW_WARNING_M3S, SWIM_LANE_FACTOR } from "@/lib/hydro";
import type { FlowInfo } from "@/lib/useRhineFlow";

/**
 * Hand-drawn vector map of the Basel Rhine knee (same orientation as the
 * official Bachab map: upstream right, Dreirosen top-left). Everything is
 * SVG so nothing pixelates; artwork is deliberately muted so the UI reads
 * on top of it. Interactions:
 *  - shore dots are clickable and set entry/exit (entry stays upstream)
 *  - yellow triangles (official entry/exit symbol) sit ON the shore line
 *  - the river animates in flow direction, speed tied to today's current
 *
 * All coordinates are hand-placed in a 1000×620 viewBox.
 */

/** Points ON the Kleinbasel (inner) shore line, upstream → downstream. */
const SHORE: Record<string, { x: number; y: number }> = {
  schwarzwaldbruecke: { x: 845, y: 272 },
  wettsteinbruecke: { x: 585, y: 445 },
  "mittlere-bruecke": { x: 405, y: 405 },
  kaserne: { x: 318, y: 335 },
  johanniterbruecke: { x: 272, y: 242 },
  dreirosen: { x: 248, y: 105 },
};

const SHORT_NAME: Record<string, string> = {
  schwarzwaldbruecke: "Tinguely",
  wettsteinbruecke: "Wettsteinbrücke",
  "mittlere-bruecke": "Mittlere Brücke",
  kaserne: "Kaserne",
  johanniterbruecke: "Johanniterbrücke",
  dreirosen: "Dreirosen (last exit)",
};

/** River centerline, upstream → downstream (drives band + flow animation). */
const CENTERLINE =
  "M 960,150 C 920,240 900,280 860,315 C 790,378 700,455 595,482 " +
  "C 495,507 445,472 398,443 C 350,413 320,398 293,358 " +
  "C 262,312 250,275 240,235 C 227,190 220,150 214,85";

/** Corridor / typical swim route along the inner shore. */
const SHORE_PATH =
  "M 880,245 C 865,258 855,266 845,272 C 760,318 675,415 585,445 " +
  "C 505,472 450,432 405,405 C 362,378 340,357 318,335 " +
  "C 296,313 280,272 272,242 C 262,206 252,155 248,105";

const BRIDGES: Array<[number, number, number, number]> = [
  [828, 262, 930, 352], // Schwarzwaldbrücke (Tinguely)
  [570, 432, 622, 532], // Wettsteinbrücke
  [383, 392, 418, 495], // Mittlere Brücke
  [205, 258, 300, 232], // Johanniterbrücke
  [168, 112, 268, 98], // Dreirosenbrücke
];

const ORDER = CORRIDOR_SPOTS.map((s) => s.id);

function Triangle({
  id,
  kind,
}: {
  id: string;
  kind: "entry" | "exit";
}) {
  const p = SHORE[id];
  if (!p) return null;
  const pts =
    kind === "entry"
      ? `${p.x - 11},${p.y - 15} ${p.x + 11},${p.y - 15} ${p.x},${p.y + 3}`
      : `${p.x - 11},${p.y + 15} ${p.x + 11},${p.y + 15} ${p.x},${p.y - 3}`;
  return (
    <g pointerEvents="none">
      <circle
        cx={p.x}
        cy={p.y}
        r={14}
        fill="none"
        stroke={kind === "entry" ? "#4ade80" : "#f87171"}
        strokeWidth={2}
        opacity={0.9}
      >
        <animate
          attributeName="r"
          values="12;19;12"
          dur="2.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.9;0.15;0.9"
          dur="2.2s"
          repeatCount="indefinite"
        />
      </circle>
      <polygon
        points={pts}
        fill="#fde047"
        stroke="#3f2d04"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

export default function RiverMap({
  entry,
  exit,
  onEntry,
  onExit,
  flow,
}: {
  entry: string;
  exit: string;
  onEntry: (id: string) => void;
  onExit: (id: string) => void;
  flow: FlowInfo;
}) {
  const kmh = flow.currentMs * SWIM_LANE_FACTOR * 3.6;
  // Faster river → faster dashes. 4 km/h ≈ 6s per cycle.
  const flowDur = `${(24 / Math.max(1, kmh)).toFixed(1)}s`;

  // Clicking a shore dot: keep entry upstream of exit, move whichever
  // marker makes sense for the clicked spot.
  const pick = (id: string) => {
    const i = ORDER.indexOf(id);
    const e = ORDER.indexOf(entry);
    const x = ORDER.indexOf(exit);
    if (i === e || i === x) return;
    if (i < e) onEntry(id);
    else if (i > x) onExit(id);
    else if (i - e <= x - i) onEntry(id);
    else onExit(id);
  };

  // Highlighted route: shore polyline between entry and exit.
  const e = ORDER.indexOf(entry);
  const x = ORDER.indexOf(exit);
  const routeIds = ORDER.slice(Math.min(e, x), Math.max(e, x) + 1);
  const routePath = routeIds
    .map((id, i) => `${i === 0 ? "M" : "L"} ${SHORE[id].x},${SHORE[id].y}`)
    .join(" ");

  const selectClass =
    "w-full appearance-none rounded-lg border border-white/15 bg-slate-900/75 px-2 py-1.5 text-sm text-slate-100 backdrop-blur";

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 shadow-lg">
      <svg viewBox="0 0 1000 620" className="block h-auto w-full">
        {/* river band */}
        <path
          d={CENTERLINE}
          fill="none"
          stroke="#16323e"
          strokeWidth={80}
          strokeLinecap="round"
        />
        {/* danger tint upstream of the entry area (toward the lock) */}
        <path
          d="M 960,150 C 930,218 912,262 878,298"
          fill="none"
          stroke="#7f1d1d"
          strokeWidth={80}
          strokeLinecap="round"
          opacity={0.35}
        />
        {/* recommended corridor along the Kleinbasel shore */}
        <path
          d={SHORE_PATH}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={24}
          strokeLinecap="round"
          opacity={0.18}
        />
        {/* animated flow */}
        <path
          d={CENTERLINE}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray="16 48"
          opacity={0.3}
          className="flow-dash"
          style={{ ["--flow-dur" as string]: flowDur }}
        />
        <path
          d={SHORE_PATH}
          fill="none"
          stroke="#5eead4"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="8 40"
          opacity={0.25}
          className="flow-dash"
          style={{ ["--flow-dur" as string]: flowDur }}
        />

        {/* bridges */}
        {BRIDGES.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#94a3b8"
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.4}
          />
        ))}

        {/* Roche towers (Kleinbasel side, upstream of Tinguely) */}
        <g opacity={0.6} stroke="#64748b" fill="#1e293b" transform="translate(-95,55)">
          <rect x={856} y={62} width={28} height={98} rx={3} />
          <rect x={896} y={95} width={24} height={65} rx={3} />
          <line x1={860} y1={92} x2={880} y2={92} />
          <line x1={860} y1={120} x2={880} y2={120} />
          <line x1={900} y1={122} x2={916} y2={122} />
        </g>
        {/* Münster */}
        <g opacity={0.45} stroke="#64748b" fill="#1e293b" strokeLinejoin="round">
          <path d="M 448,568 L 448,532 L 457,514 L 466,532 L 466,552 L 480,552 L 480,530 L 489,512 L 498,530 L 498,568 Z" />
        </g>

        {/* today's current, in the empty bend */}
        {flow.q !== null && (
          <g textAnchor="middle" pointerEvents="none">
            <text x={585} y={200} fill="#7dd3fc" fontSize={40} fontWeight={700}>
              {kmh.toFixed(1)} km/h
            </text>
            <text x={585} y={230} fill="#64748b" fontSize={16}>
              {flow.status === "live" ? "●" : "◐"} {Math.round(flow.q)} m³/s
            </text>
            {flow.q > FLOW_WARNING_M3S && (
              <text x={585} y={262} fill="#fca5a5" fontSize={18} fontWeight={600}>
                ⚠ no swimming
              </text>
            )}
          </g>
        )}

        {/* highlighted swim route between entry and exit */}
        <path
          d={routePath}
          fill="none"
          stroke="#fde047"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 9"
          opacity={0.85}
          pointerEvents="none"
          className="flow-dash"
          style={{ ["--flow-dur" as string]: flowDur }}
        />

        {/* clickable shore spots */}
        {ORDER.map((id) => {
          const p = SHORE[id];
          return (
            <g
              key={id}
              onClick={() => pick(id)}
              className="cursor-pointer"
              role="button"
              aria-label={SHORT_NAME[id]}
            >
              <circle cx={p.x} cy={p.y} r={20} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={7}
                fill="#e2e8f0"
                stroke="#0f172a"
                strokeWidth={2.5}
                opacity={0.95}
              />
              <title>{SHORT_NAME[id]}</title>
            </g>
          );
        })}

        <Triangle id={entry} kind="entry" />
        <Triangle id={exit} kind="exit" />
      </svg>

      {/* pickers: right side — in at the top, out at the bottom */}
      <div className="absolute right-2 top-2 flex w-[46%] max-w-[240px] items-center gap-1.5 rounded-xl bg-slate-900/40 p-1 backdrop-blur-[2px]">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
        <select
          value={entry}
          aria-label="Entry spot"
          onChange={(ev) => onEntry(ev.target.value)}
          className={selectClass}
        >
          {CORRIDOR_SPOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {SHORT_NAME[s.id] ?? s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="absolute bottom-2 right-2 flex w-[46%] max-w-[240px] items-center gap-1.5 rounded-xl bg-slate-900/40 p-1 backdrop-blur-[2px]">
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
        <select
          value={exit}
          aria-label="Exit spot"
          onChange={(ev) => onExit(ev.target.value)}
          className={selectClass}
        >
          {CORRIDOR_SPOTS.map((s) => (
            <option key={s.id} value={s.id}>
              {SHORT_NAME[s.id] ?? s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
