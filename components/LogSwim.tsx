"use client";

import { useEffect, useRef, useState } from "react";
import { BASEL_SPOTS, CORRIDOR_SPOTS, distanceBetweenSpots } from "@/lib/rivers";
import type { SwimInput } from "@/lib/types";
import type { FlowInfo } from "@/lib/useRhineFlow";
import EffortScale from "./EffortScale";
import RiverMap from "./RiverMap";

const ORDER = CORRIDOR_SPOTS.map((s) => s.id);

/** Logging = the map (RiverMap) plus one row: minutes and effort. */
export default function LogSwim({
  effort,
  onEffortChange,
  onChange,
  flow,
}: {
  effort: number;
  onEffortChange: (level: number) => void;
  onChange: (input: SwimInput | null, label: string) => void;
  flow: FlowInfo;
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

  // The river flows one way — keep entry upstream of exit, swapping if the
  // user picks them crossed.
  const setSpots = (nextEntry: string, nextExit: string) => {
    if (ORDER.indexOf(nextEntry) > ORDER.indexOf(nextExit)) {
      [nextEntry, nextExit] = [nextExit, nextEntry];
    }
    setEntry(nextEntry);
    setExit(nextExit);
    emit(nextEntry, nextExit, minutes);
  };

  // Emit the sensible defaults once so results show without any interaction.
  const emittedOnce = useRef(false);
  useEffect(() => {
    if (emittedOnce.current) return;
    emittedOnce.current = true;
    emit(entry, exit, minutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <RiverMap
        entry={entry}
        exit={exit}
        onEntry={(id) => setSpots(id, exit)}
        onExit={(id) => setSpots(entry, id)}
        flow={flow}
      />

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
