"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import {
  BASEL_SPOTS,
  CORRIDOR_SPOTS,
  distanceBetweenSpots,
  spotIndex,
} from "@/lib/rivers";
import type { SwimInput } from "@/lib/types";
import EffortScale from "./EffortScale";

/**
 * Logging = the map. The essential band of the official zone map
 * (Schwarzwaldbrücke → Dreirosenbrücke, north-shore corridor) is the
 * background; the entry/exit pickers float on top and yellow triangle
 * markers — the official map's entry/exit symbol — follow them.
 * Pin positions are hand-placed percent coordinates on the 666×342 crop.
 */
const SHORT_NAME: Record<string, string> = {
  schwarzwaldbruecke: "Schwarzwaldbrücke",
  wettsteinbruecke: "Wettsteinbrücke",
  "mittlere-bruecke": "Mittlere Brücke",
  kaserne: "Kaserne",
  johanniterbruecke: "Johanniterbrücke",
  dreirosen: "Dreirosen (last exit)",
};

const PIN_POS: Record<string, { x: number; y: number }> = {
  dreirosen: { x: 19.6, y: 20 },
  johanniterbruecke: { x: 23.0, y: 44 },
  kaserne: { x: 29.5, y: 62 },
  "mittlere-bruecke": { x: 36.9, y: 73 },
  wettsteinbruecke: { x: 54.7, y: 80 },
  schwarzwaldbruecke: { x: 87.8, y: 45 },
};

/** Official-style yellow triangle: ▼ = get in, ▲ = get out. */
function Pin({ spotId, kind }: { spotId: string; kind: "entry" | "exit" }) {
  const pos = PIN_POS[spotId];
  if (!pos) return null;
  const spot = BASEL_SPOTS[spotIndex(spotId)];
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      aria-label={`${spot?.name ?? spotId} (${kind})`}
    >
      <span className="relative flex items-center justify-center">
        <span className="absolute h-6 w-6 animate-ping rounded-full bg-yellow-300 opacity-40" />
        <span
          className="relative text-xl leading-none text-yellow-300"
          style={{ textShadow: "0 0 3px rgba(0,0,0,.9)" }}
        >
          {kind === "entry" ? "▼" : "▲"}
        </span>
        <span
          className={`absolute -bottom-1.5 h-1.5 w-1.5 rounded-full ${
            kind === "entry" ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </span>
    </div>
  );
}

export default function LogSwim({
  effort,
  onEffortChange,
  onChange,
}: {
  effort: number;
  onEffortChange: (level: number) => void;
  onChange: (input: SwimInput | null, label: string) => void;
}) {
  const [entry, setEntry] = useState<string>("schwarzwaldbruecke");
  const [exit, setExit] = useState<string>("johanniterbruecke");
  const [minutes, setMinutes] = useState("25");

  const emit = (nextEntry: string, nextExit: string, nextMinutes: string) => {
    const distance =
      nextEntry && nextExit ? distanceBetweenSpots(nextEntry, nextExit) : 0;
    const mins = parseFloat(nextMinutes);
    if (distance > 0 && Number.isFinite(mins) && mins > 0) {
      const from = BASEL_SPOTS.find((s) => s.id === nextEntry)!.name;
      const to = BASEL_SPOTS.find((s) => s.id === nextExit)!.name;
      onChange(
        // Self-reported swims follow the river line → alignment = 1.
        { distanceMeters: distance, elapsedSeconds: mins * 60, routeAlignment: 1 },
        `${from} → ${to}`
      );
    } else {
      onChange(null, "");
    }
  };

  // Emit the sensible defaults once so results show without any interaction.
  const emittedOnce = useRef(false);
  useEffect(() => {
    if (emittedOnce.current) return;
    emittedOnce.current = true;
    emit(entry, exit, minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectClass =
    "w-full appearance-none rounded-lg border border-white/20 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 backdrop-blur";

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700 shadow-lg">
        <img
          src="/rhine-corridor.jpg"
          alt="Basel Rhine swimming corridor map"
          className="block h-auto w-full"
        />
        {/* soften the artwork so it reads as background */}
        <div className="absolute inset-0 bg-slate-900/25" />
        <Pin spotId={entry} kind="entry" />
        <Pin spotId={exit} kind="exit" />
        {/* pickers float on the map */}
        <div className="absolute inset-x-0 top-0 grid grid-cols-2 gap-2 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-transparent p-2 pb-5">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500"
            />
            <select
              value={entry}
              aria-label="Entry spot"
              onChange={(e) => {
                setEntry(e.target.value);
                emit(e.target.value, exit, minutes);
              }}
              className={selectClass}
            >
              {CORRIDOR_SPOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {SHORT_NAME[s.id] ?? s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
            />
            <select
              value={exit}
              aria-label="Exit spot"
              onChange={(e) => {
                setExit(e.target.value);
                emit(entry, e.target.value, minutes);
              }}
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
      </div>

      <div className="flex items-center gap-3">
        <label className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2">
          <span aria-hidden>⏱️</span>
          <input
            type="number"
            min="1"
            step="1"
            value={minutes}
            aria-label="Minutes in the water"
            onChange={(e) => {
              setMinutes(e.target.value);
              emit(entry, exit, e.target.value);
            }}
            className="w-14 bg-transparent text-base text-slate-100 outline-none"
          />
          <span className="text-xs text-slate-500">min</span>
        </label>
        <EffortScale value={effort} onChange={onEffortChange} />
      </div>
    </div>
  );
}
