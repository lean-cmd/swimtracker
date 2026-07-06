"use client";

import { useEffect, useRef, useState } from "react";
import { BASEL_SPOTS, distanceBetweenSpots } from "@/lib/rivers";
import type { SwimInput } from "@/lib/types";
import RhineMap from "./RhineMap";

export type Effort = "swim" | "float";

/**
 * The whole logging flow, above the fold: official zone map with pins that
 * follow the two dropdowns, plus time and effort. No buttons — results
 * update live via onChange as soon as the inputs make sense.
 */
export default function LogSwim({
  onChange,
}: {
  onChange: (
    input: SwimInput | null,
    effort: Effort,
    label: string
  ) => void;
}) {
  const [entry, setEntry] = useState<string>("tinguely");
  const [exit, setExit] = useState<string>("johanniterbruecke");
  const [minutes, setMinutes] = useState("25");
  const [effort, setEffort] = useState<Effort>("swim");

  const emit = (
    nextEntry: string,
    nextExit: string,
    nextMinutes: string,
    nextEffort: Effort
  ) => {
    const distance =
      nextEntry && nextExit ? distanceBetweenSpots(nextEntry, nextExit) : 0;
    const mins = parseFloat(nextMinutes);
    if (distance > 0 && Number.isFinite(mins) && mins > 0) {
      const from = BASEL_SPOTS.find((s) => s.id === nextEntry)!.name;
      const to = BASEL_SPOTS.find((s) => s.id === nextExit)!.name;
      onChange(
        // Self-reported swims follow the river line → alignment = 1.
        { distanceMeters: distance, elapsedSeconds: mins * 60, routeAlignment: 1 },
        nextEffort,
        `${from} → ${to}`
      );
    } else {
      onChange(null, nextEffort, "");
    }
  };

  // Emit the sensible defaults once so results show without any interaction.
  const emittedOnce = useRef(false);
  useEffect(() => {
    if (emittedOnce.current) return;
    emittedOnce.current = true;
    emit(entry, exit, minutes, effort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outsideRecommended = [entry, exit].some(
    (id) => BASEL_SPOTS.find((s) => s.id === id)?.outsideRecommended
  );

  const selectClass =
    "w-full rounded-xl border border-slate-600 bg-slate-800 p-3 text-base text-slate-100";

  return (
    <div className="space-y-3">
      <RhineMap entryId={entry || null} exitId={exit || null} />

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium text-slate-300">
          🟢 Got in at
          <select
            value={entry}
            onChange={(e) => {
              setEntry(e.target.value);
              emit(e.target.value, exit, minutes, effort);
            }}
            className={`mt-1 ${selectClass}`}
          >
            {BASEL_SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-300">
          🔴 Got out at
          <select
            value={exit}
            onChange={(e) => {
              setExit(e.target.value);
              emit(entry, e.target.value, minutes, effort);
            }}
            className={`mt-1 ${selectClass}`}
          >
            {BASEL_SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium text-slate-300">
          ⏱️ Minutes in the water
          <input
            type="number"
            min="1"
            step="1"
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value);
              emit(entry, exit, e.target.value, effort);
            }}
            className={`mt-1 ${selectClass}`}
          />
        </label>
        <label className="block text-sm font-medium text-slate-300">
          💪 Effort
          <select
            value={effort}
            onChange={(e) => {
              const v = e.target.value as Effort;
              setEffort(v);
              emit(entry, exit, minutes, v);
            }}
            className={`mt-1 ${selectClass}`}
          >
            <option value="swim">I swam 🏊</option>
            <option value="float">I floated 🛟</option>
          </select>
        </label>
      </div>

      {outsideRecommended && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          ⚠️ Careful — part of this stretch is outside the recommended
          swimming area.
        </p>
      )}
    </div>
  );
}
