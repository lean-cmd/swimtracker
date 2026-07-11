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
  const dragRef = useRef<{ y: number; val: number } | null>(null);

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
    <div className="flex flex-col gap-2">
      <div className="relative h-[38dvh] min-h-[210px]">
        <RiverMap
          entry={entry}
          exit={exit}
          onEntry={(id) => setSpots(id, exit)}
          onExit={(id) => setSpots(entry, id)}
          flow={flow}
        />
      </div>

      <div className="flex h-[88px] shrink-0 items-stretch gap-2">
        {/* swipe up/down to set the time — no keyboard needed */}
        <div className="flex flex-1 flex-col">
          <span className="pl-2 pb-0.5 text-[9px] font-medium uppercase tracking-widest text-slate-500">
            Time
          </span>
        <div
          role="slider"
          aria-label="Minutes in the water — swipe up or down"
          aria-valuenow={parseFloat(minutes) || 0}
          aria-valuemin={1}
          aria-valuemax={180}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = { y: e.clientY, val: parseFloat(minutes) || 25 };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            const next = Math.min(
              180,
              Math.max(1, Math.round(d.val + (d.y - e.clientY) / 5))
            );
            if (String(next) !== minutes) {
              setMinutes(String(next));
              emit(entry, exit, String(next));
            }
          }}
          onPointerUp={() => (dragRef.current = null)}
          onPointerCancel={() => (dragRef.current = null)}
          className="flex flex-1 cursor-ns-resize touch-none select-none items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3"
        >
          <span className="flex flex-col text-[9px] leading-[9px] text-slate-500">
            <span>▲</span>
            <span>▼</span>
          </span>
          <span className="w-12 text-center text-2xl font-bold text-slate-100">
            {minutes}
          </span>
          <span className="text-sm text-slate-500">min</span>
        </div>
        </div>
        <div className="flex flex-1 flex-col">
          <span className="pl-2 pb-0.5 text-[9px] font-medium uppercase tracking-widest text-slate-500">
            Effort
          </span>
          <EffortScale value={effort} onChange={onEffortChange} />
        </div>
      </div>
    </div>
  );
}
