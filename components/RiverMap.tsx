"use client";

import { useEffect, useRef, useState } from "react";
import { CORRIDOR_SPOTS } from "@/lib/rivers";
import { FLOW_WARNING_M3S, SWIM_LANE_FACTOR } from "@/lib/hydro";
import type { FlowInfo } from "@/lib/useRhineFlow";

/**
 * Hand-drawn vector map of the Basel Rhine knee (official Bachab-map
 * orientation: upstream right, Dreirosen top-left). Design language aims at
 * Google-Maps-style restraint: muted land/water, straight perpendicular
 * bridges with quiet labels, recognizable landmark silhouettes, one accent
 * color for the route.
 *
 * The swim route is a true sub-segment of the curved shore path: on mount
 * the path is sampled (getPointAtLength) to find each spot's arc position,
 * and the highlight is revealed with a dash trick — so it can never cut
 * over land. Spot markers snap onto the same samples.
 */

/** Hand-placed anchors near the Kleinbasel shore; snapped to the path at runtime. */
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

/** River centerline, upstream → downstream (band + flow animation). */
const CENTERLINE =
  "M 960,150 C 920,240 900,280 860,315 C 790,378 700,455 595,482 " +
  "C 495,507 445,472 398,443 C 350,413 320,398 293,358 " +
  "C 262,312 250,275 240,235 C 227,190 220,150 214,85";

/** Corridor / swim line along the inner (Kleinbasel) shore. */
const SHORE_PATH =
  "M 880,245 C 865,258 855,266 845,272 C 760,318 675,415 585,445 " +
  "C 505,472 450,432 405,405 C 362,378 340,357 318,335 " +
  "C 296,313 280,272 272,242 C 262,206 252,155 248,105";

/** Straight bridges, perpendicular to the centerline at each crossing. */
const BRIDGES: Array<{
  line: [number, number, number, number];
  label: string;
  at: [number, number];
  anchor?: "start" | "middle" | "end";
}> = [
  { line: [823, 266, 913, 350], label: "Schwarzwaldbrücke", at: [908, 388], anchor: "end" },
  { line: [585, 421, 615, 543], label: "Wettsteinbrücke", at: [572, 402], anchor: "end" },
  { line: [431, 390, 365, 496], label: "Mittlere Brücke", at: [447, 382], anchor: "start" },
  { line: [183, 267, 303, 237], label: "Johanniterbrücke", at: [314, 234], anchor: "start" },
  { line: [155, 112, 275, 98], label: "Dreirosenbrücke", at: [290, 120], anchor: "start" },
];

const ORDER = CORRIDOR_SPOTS.map((s) => s.id);

type Arc = {
  total: number;
  at: Record<string, number>;
  pts: Record<string, { x: number; y: number }>;
};

function Triangle({
  p,
  kind,
}: {
  p: { x: number; y: number };
  kind: "entry" | "exit";
}) {
  const pts =
    kind === "entry"
      ? `${p.x - 10},${p.y - 14} ${p.x + 10},${p.y - 14} ${p.x},${p.y + 3}`
      : `${p.x - 10},${p.y + 14} ${p.x + 10},${p.y + 14} ${p.x},${p.y - 3}`;
  return (
    <g pointerEvents="none">
      <circle
        cx={p.x}
        cy={p.y}
        r={14}
        fill="none"
        stroke={kind === "entry" ? "#4ade80" : "#f87171"}
        strokeWidth={2}
        opacity={0.85}
      >
        <animate attributeName="r" values="12;19;12" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;0.1;0.85" dur="2.6s" repeatCount="indefinite" />
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
  // Slow, riverine drift: ~10s per cycle at a typical 5.7 km/h.
  const flowDur = `${(60 / Math.max(1.5, kmh)).toFixed(1)}s`;

  const shoreRef = useRef<SVGPathElement>(null);
  const [arc, setArc] = useState<Arc | null>(null);

  useEffect(() => {
    const el = shoreRef.current;
    if (!el) return;
    const total = el.getTotalLength();
    const samples: Array<{ x: number; y: number; len: number }> = [];
    for (let i = 0; i <= 400; i++) {
      const len = (total * i) / 400;
      const p = el.getPointAtLength(len);
      samples.push({ x: p.x, y: p.y, len });
    }
    const at: Record<string, number> = {};
    const pts: Record<string, { x: number; y: number }> = {};
    for (const id of ORDER) {
      const t = SHORE[id];
      let best = samples[0];
      let bd = Infinity;
      for (const s of samples) {
        const d = (s.x - t.x) ** 2 + (s.y - t.y) ** 2;
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      at[id] = best.len;
      pts[id] = { x: best.x, y: best.y };
    }
    setArc({ total, at, pts });
  }, []);

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

  const pos = (id: string) => arc?.pts[id] ?? SHORE[id];

  // Route reveal: dash exactly covering [entry…exit] along the shore path.
  const routeStart = arc ? Math.min(arc.at[entry], arc.at[exit]) : 0;
  const routeEnd = arc ? Math.max(arc.at[entry], arc.at[exit]) : 0;
  const routeDash = arc
    ? {
        strokeDasharray: `${routeEnd - routeStart} ${arc.total}`,
        strokeDashoffset: -routeStart,
      }
    : { strokeDasharray: "0 1" };

  const selectClass =
    "w-full appearance-none rounded-lg border border-white/15 bg-slate-900/75 px-2 py-1.5 text-sm text-slate-100 backdrop-blur";

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 shadow-lg">
      <svg viewBox="0 0 1000 620" className="block h-auto w-full">
        {/* ——— water ——— */}
        <path d={CENTERLINE} fill="none" stroke="#16323e" strokeWidth={80} strokeLinecap="round" />
        {/* danger stretch upstream, toward the lock */}
        <path
          d="M 960,150 C 930,218 912,262 878,298"
          fill="none"
          stroke="#7f1d1d"
          strokeWidth={80}
          strokeLinecap="round"
          opacity={0.25}
        />
        {/* recommended corridor along the Kleinbasel shore */}
        <path
          d={SHORE_PATH}
          fill="none"
          stroke="#14b8a6"
          strokeWidth={24}
          strokeLinecap="round"
          opacity={0.14}
        />
        {/* slow layered drift — broad sheets of water, staggered */}
        <path
          d={CENTERLINE}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray="60 90"
          opacity={0.07}
          className="flow-dash"
          style={{ ["--flow-dur" as string]: flowDur }}
        />
        <path
          d={CENTERLINE}
          fill="none"
          stroke="#7dd3fc"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray="34 116"
          opacity={0.14}
          className="flow-dash"
          style={{ ["--flow-dur" as string]: flowDur, animationDelay: "-4s" }}
        />

        {/* ——— bridges: straight, shortest crossing, quiet labels ——— */}
        {BRIDGES.map(({ line: [x1, y1, x2, y2], label, at: [lx, ly], anchor }) => (
          <g key={label}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#0b1520"
              strokeWidth={10}
              strokeLinecap="round"
              opacity={0.7}
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#8fa3b8"
              strokeWidth={5.5}
              strokeLinecap="round"
              opacity={0.55}
            />
            <text
              x={lx}
              y={ly}
              fill="#7c8ba1"
              fontSize={21}
              textAnchor={anchor ?? "middle"}
              opacity={0.9}
            >
              {label}
            </text>
          </g>
        ))}
        {/* Kaserne has no bridge — just its label */}
        <text x={352} y={328} fill="#7c8ba1" fontSize={20} textAnchor="start" opacity={0.9}>
          Kaserne
        </text>

        {/* ——— landmarks ——— */}
        {/* Roche towers: stepped, tapering silhouettes (Kleinbasel, upstream) */}
        <g fill="#233247" stroke="#8fa3b8" strokeWidth={1.5} opacity={0.85}>
          <path d="M 742,190 L 742,58 L 760,58 L 760,76 L 766,76 L 766,96 L 772,96 L 772,118 L 777,118 L 777,142 L 781,142 L 781,166 L 784,166 L 784,190 Z" />
          <path d="M 800,190 L 800,96 L 815,96 L 815,110 L 820,110 L 820,126 L 824,126 L 824,144 L 827,144 L 827,164 L 829,164 L 829,190 Z" />
          <g stroke="#8fa3b8" opacity={0.4}>
            <line x1={745} y1={80} x2={758} y2={80} />
            <line x1={745} y1={104} x2={764} y2={104} />
            <line x1={745} y1={128} x2={770} y2={128} />
            <line x1={745} y1={152} x2={776} y2={152} />
            <line x1={803} y1={116} x2={817} y2={116} />
            <line x1={803} y1={140} x2={821} y2={140} />
          </g>
        </g>
        <text x={762} y={210} fill="#7c8ba1" fontSize={18} textAnchor="middle" opacity={0.85}>
          Roche
        </text>

        {/* Münster: twin towers, spires, nave + rose window (Grossbasel bank) */}
        <g fill="#233247" stroke="#8fa3b8" strokeWidth={1.5} opacity={0.85}>
          <rect x={436} y={532} width={12} height={40} />
          <polygon points="434,532 450,532 442,504" />
          <rect x={478} y={532} width={12} height={40} />
          <polygon points="476,532 492,532 484,504" />
          <rect x={448} y={546} width={30} height={26} />
          <polygon points="448,546 478,546 463,532" />
          <circle cx={463} cy={556} r={4.5} fill="none" opacity={0.9} />
        </g>
        <text x={463} y={592} fill="#7c8ba1" fontSize={18} textAnchor="middle" opacity={0.85}>
          Münster
        </text>

        {/* ——— shore path (invisible reference for arc sampling) ——— */}
        <path ref={shoreRef} d={SHORE_PATH} fill="none" stroke="none" />

        {/* ——— route: curved sub-segment of the shore, casing + fill ——— */}
        <path
          d={SHORE_PATH}
          fill="none"
          stroke="#92600a"
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.9}
          pointerEvents="none"
          style={routeDash}
        />
        <path
          d={SHORE_PATH}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={4.5}
          strokeLinecap="round"
          pointerEvents="none"
          style={routeDash}
        />

        {/* ——— clickable spots (snapped to the shore path) ——— */}
        {ORDER.map((id) => {
          const p = pos(id);
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
                r={6.5}
                fill="#e2e8f0"
                stroke="#0f172a"
                strokeWidth={2.5}
                opacity={0.95}
              />
              <title>{SHORT_NAME[id]}</title>
            </g>
          );
        })}

        <Triangle p={pos(entry)} kind="entry" />
        <Triangle p={pos(exit)} kind="exit" />
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

      {/* flow legend, anchored like a map attribution */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 backdrop-blur-[2px]">
        {flow.q === null ? (
          <span className="text-xs text-slate-400">…</span>
        ) : (
          <>
            <span className="text-sm font-semibold text-sky-300">
              {kmh.toFixed(1)} km/h
            </span>
            <span className="text-[11px] text-slate-500" title={flow.status}>
              {flow.status === "live" ? "●" : "◐"} {Math.round(flow.q)} m³/s
            </span>
          </>
        )}
      </div>
      {flow.q !== null && flow.q > FLOW_WARNING_M3S && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-red-500/60 bg-red-950/80 px-3 py-1 text-sm font-medium text-red-300 backdrop-blur-[2px]">
          ⚠ no swimming
        </div>
      )}
    </div>
  );
}
