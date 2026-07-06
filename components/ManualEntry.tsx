"use client";

import { useState } from "react";
import { BASEL_SPOTS, distanceBetweenSpots } from "@/lib/rivers";
import type { SwimInput } from "@/lib/types";

/**
 * Fallback for swims where the watch didn't track properly (common in the
 * Rhine — GPS drops underwater): pick entry/exit spots in Basel, enter the
 * time in the water, and say whether you swam or floated.
 */
export default function ManualEntry({
  onSubmit,
}: {
  onSubmit: (input: SwimInput, effort: "swim" | "float", label: string) => void;
}) {
  const [entry, setEntry] = useState(BASEL_SPOTS[0].id);
  const [exit, setExit] = useState(BASEL_SPOTS[BASEL_SPOTS.length - 1].id);
  const [minutes, setMinutes] = useState("30");
  const [effort, setEffort] = useState<"swim" | "float">("swim");

  const distance = distanceBetweenSpots(entry, exit);
  const mins = parseFloat(minutes);
  const valid = distance > 0 && Number.isFinite(mins) && mins > 0;

  const selectClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 p-2.5 text-sm text-slate-100";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-300">
          Entry point
          <select
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className={`mt-1 ${selectClass}`}
          >
            {BASEL_SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300">
          Exit point
          <select
            value={exit}
            onChange={(e) => setExit(e.target.value)}
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

      <p className="text-xs text-slate-400">
        Estimated distance between spots:{" "}
        <span className="font-medium text-slate-200">
          {distance > 0 ? `${Math.round(distance)} m` : "pick two different spots"}
        </span>{" "}
        · Spots run upstream → downstream; exit before the harbor at
        Dreirosenbrücke.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-300">
          Time in the water (minutes)
          <input
            type="number"
            min="1"
            step="0.5"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={`mt-1 ${selectClass}`}
          />
        </label>
        <div className="block text-sm text-slate-300">
          Effort
          <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-600">
            {(
              [
                ["swim", "I swam 🏊"],
                ["float", "I floated 🛟"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setEffort(value)}
                className={`flex-1 p-2.5 text-sm ${
                  effort === value
                    ? "bg-sky-600 font-medium text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        disabled={!valid}
        onClick={() => {
          const from = BASEL_SPOTS.find((s) => s.id === entry)!.name;
          const to = BASEL_SPOTS.find((s) => s.id === exit)!.name;
          onSubmit(
            // Manual mode assumes a straight downstream swim, so the full
            // current acts along the route (alignment = 1).
            { distanceMeters: distance, elapsedSeconds: mins * 60, routeAlignment: 1 },
            effort,
            `${from} → ${to}`
          );
        }}
        className="w-full rounded-lg bg-sky-600 p-3 font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Calculate
      </button>
    </div>
  );
}
