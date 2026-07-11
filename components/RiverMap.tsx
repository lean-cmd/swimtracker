"use client";

import { useEffect, useRef, useState } from "react";
import { CORRIDOR_SPOTS } from "@/lib/rivers";
import {
  MapSwimmer,
  MapWickelfisch,
  SwimmerIcon,
  WickelfischIcon,
} from "./icons";
import { FLOW_WARNING_M3S, SWIM_LANE_FACTOR } from "@/lib/hydro";
import type { FlowInfo } from "@/lib/useRhineFlow";

/**
 * Hand-drawn vector map of the Basel Rhine knee (official Bachab-map
 * orientation: upstream right, Dreirosen top-left). Muted maps-style
 * artwork; one accent color for the route.
 *
 * The swim route is a true sub-segment of the curved shore path: on mount
 * the path is sampled (getPointAtLength) to find each spot's arc position,
 * and the highlight is revealed with a dash window — so it can never cut
 * over land. Spot markers snap onto the same samples.
 *
 * All coordinates hand-placed in a 1000×620 viewBox.
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
  wettsteinbruecke: "Wettstein",
  "mittlere-bruecke": "Mittlere",
  kaserne: "Kaserne",
  johanniterbruecke: "Johanniter",
  dreirosen: "Dreirosen (end)",
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

/** Straight bridges, perpendicular to the centerline; labels run along them. */
const BRIDGES: Array<{ line: [number, number, number, number]; label: string }> = [
  { line: [823, 266, 913, 350], label: "Schwarzwaldbrücke" },
  { line: [585, 421, 615, 543], label: "Wettsteinbrücke" },
  { line: [431, 390, 365, 496], label: "Mittlere Brücke" },
  { line: [183, 267, 303, 237], label: "Johanniterbrücke" },
  { line: [155, 112, 275, 98], label: "Dreirosenbrücke" },
];

/**
 * The four Rhine ferries (Fähren), each a cable across the river with the
 * boat mid-stream: Wild Maa (St. Alban), Leu (Münster), Vogel Gryff
 * (Klingental), Ueli (St. Johann).
 */
const FERRIES: Array<{ line: [number, number, number, number] }> = [
  { line: [716, 384, 764, 452] },
  { line: [490, 465, 500, 549] },
  { line: [328, 335, 258, 381] },
  { line: [188, 192, 268, 182] },
];

const ORDER = CORRIDOR_SPOTS.map((s) => s.id);

type Arc = {
  total: number;
  at: Record<string, number>;
  pts: Record<string, { x: number; y: number }>;
};

/** Basel ferry: pointed gondola hull with a small cabin, hanging on its cable. */
function FerryBoat({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={0.75} pointerEvents="none">
      <path d="M -10,0 Q 0,7 10,0 Q 0,-3 -10,0 Z" fill="#cbd5e1" stroke="#334155" strokeWidth={1} />
      <rect x={-3.5} y={-6.5} width={7} height={5} rx={1} fill="#cbd5e1" stroke="#334155" strokeWidth={1} />
    </g>
  );
}

/** Entry = swimmer over the official yellow triangle; exit = Wickelfisch. */
function Marker({
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
      {kind === "entry" ? (
        <MapSwimmer x={p.x} y={p.y} />
      ) : (
        <MapWickelfisch x={p.x} y={p.y} />
      )}
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
    // Dreirosen is the mandatory last exit — never an entry.
    if (id === "dreirosen") return onExit(id);
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

  // 16px picker text so iOS Safari doesn't zoom on focus.
  const selectClass =
    "w-full appearance-none rounded-lg border border-white/15 bg-slate-900/75 px-2 py-2 text-base text-slate-100 backdrop-blur";

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

        {/* ——— ferries: dotted cable + gondola ——— */}
        {FERRIES.map(({ line: [x1, y1, x2, y2] }, i) => (
          <g key={i}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9fb3c8"
              strokeWidth={2}
              strokeDasharray="2 7"
              strokeLinecap="round"
              opacity={0.55}
            />
            <FerryBoat x={(x1 + x2) / 2} y={(y1 + y2) / 2} />
          </g>
        ))}

        {/* ——— bridges: straight crossings, labels along the deck ——— */}
        {BRIDGES.map(({ line: [x1, y1, x2, y2], label }) => {
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          let deg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
          if (deg > 90) deg -= 180;
          if (deg < -90) deg += 180;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const px = -(y2 - y1) / len; // unit perpendicular
          const py = (x2 - x1) / len;
          return (
            <g key={label}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0b1520" strokeWidth={10} strokeLinecap="round" opacity={0.7} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8fa3b8" strokeWidth={5.5} strokeLinecap="round" opacity={0.55} />
              <text
                transform={`translate(${mx + px * 16},${my + py * 16}) rotate(${deg})`}
                fill="#7c8ba1"
                fontSize={19}
                textAnchor="middle"
                opacity={0.9}
              >
                {label}
              </text>
            </g>
          );
        })}
        {/* Kaserne has no bridge — just its label */}
        <text x={352} y={328} fill="#7c8ba1" fontSize={19} textAnchor="start" opacity={0.9}>
          Kaserne
        </text>

        {/* ——— landmarks ——— */}
        {/* Roche towers: right on the Kleinbasel bank, ~300 m below Tinguely */}
        <g fill="#dbe4ee" fillOpacity={0.22} stroke="#94a3b8" strokeWidth={1.8} opacity={0.9}>
          <path d="M 748,300 L 748,168 L 764,168 L 764,200 L 770,200 L 770,235 L 776,235 L 776,268 L 782,268 L 782,300 Z" />
          <path d="M 790,300 L 790,210 L 803,210 L 803,238 L 808,238 L 808,266 L 812,266 L 812,300 Z" />
          <g stroke="#94a3b8" opacity={0.45} strokeWidth={1.2}>
            <line x1={751} y1={190} x2={762} y2={190} />
            <line x1={751} y1={214} x2={767} y2={214} />
            <line x1={751} y1={240} x2={773} y2={240} />
            <line x1={751} y1={266} x2={779} y2={266} />
            <line x1={793} y1={230} x2={801} y2={230} />
            <line x1={793} y1={254} x2={806} y2={254} />
          </g>
        </g>

        {/* Basel Münster: twin towers with openwork spires, gabled facade with
            rose window, long nave with ridge turret (Grossbasel bank) */}
        <g fill="#233247" stroke="#8fa3b8" strokeWidth={1.5} opacity={0.9}>
          <rect x={430} y={540} width={13} height={56} />
          <polygon points="427,540 446,540 436.5,498" />
          <line x1={430} y1={556} x2={443} y2={556} opacity={0.6} />
          <rect x={479} y={540} width={13} height={56} />
          <polygon points="476,540 495,540 485.5,502" />
          <line x1={479} y1={556} x2={492} y2={556} opacity={0.6} />
          <rect x={443} y={556} width={36} height={40} />
          <polygon points="443,556 479,556 461,534" />
          <circle cx={461} cy={568} r={5.5} fill="none" />
          <rect x={495} y={566} width={58} height={30} />
          <polygon points="495,566 553,566 549,548 499,548" />
          <polygon points="520,548 528,548 524,538" />
        </g>
        <text x={490} y={614} fill="#7c8ba1" fontSize={17} textAnchor="middle" opacity={0.85}>
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
              <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
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

        <Marker p={pos(entry)} kind="entry" />
        <Marker p={pos(exit)} kind="exit" />
      </svg>

      {/* pickers: right side — in at the top, out at the bottom */}
      <div className="absolute right-2 top-2 flex w-[48%] max-w-[250px] items-center gap-1.5 rounded-xl bg-slate-900/40 p-1 backdrop-blur-[2px]">
        <SwimmerIcon className="h-5 w-7 shrink-0" />
        <select
          value={entry}
          aria-label="Entry spot"
          onChange={(ev) => onEntry(ev.target.value)}
          className={selectClass}
        >
          {CORRIDOR_SPOTS.filter((s) => s.id !== "dreirosen").map((s) => (
            <option key={s.id} value={s.id}>
              {SHORT_NAME[s.id] ?? s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="absolute bottom-2 right-2 flex w-[48%] max-w-[250px] items-center gap-1.5 rounded-xl bg-slate-900/40 p-1 backdrop-blur-[2px]">
        <WickelfischIcon className="h-5 w-7 shrink-0" />
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
            <span
              className="whitespace-nowrap text-sm font-semibold text-sky-300"
              title={`${Math.round(flow.q)} m³/s (${flow.status})`}
            >
              {kmh.toFixed(1)} km/h
            </span>
            {flow.tempC !== null && (
              <span
                className="text-sm font-semibold text-teal-300"
                title="water temperature"
              >
                {flow.tempC.toFixed(1)}°
              </span>
            )}
            {flow.status === "live" && (
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                live
              </span>
            )}
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
