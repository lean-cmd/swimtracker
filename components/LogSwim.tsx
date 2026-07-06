"use client";

import { useState } from "react";
import { BASEL_SPOTS, distanceBetweenSpots, spotIndex } from "@/lib/rivers";
import type { SwimInput } from "@/lib/types";
import BaselMap from "./BaselMap";

/**
 * Basel-first self-reported logging: pick entry/exit on the map (or the
 * dropdowns), enter time in the water, say whether you swam or floated.
 * Built for the common case — trackers lose GPS in the Rhine.
 */
export default function LogSwim({
  onSubmit,
}: {
  onSubmit: (input: SwimInput, effort: "swim" | "float", label: string) => void;
}) {
  const [entry, setEntry] = useState<string>("tinguely");
  const [exit, setExit] = useState<string>("johanniterbruecke");
  const [minutes, setMinutes] = useState("25");
  const [effort, setEffort] = useState<"swim" | "float">("swim");

  // Map taps: first tap (or tap while a full pair exists) restarts with a new
  // entry; second tap sets the exit. Order is normalized to downstream.
  const pickSpot = (id: string) => {
    if (!entry || (entry && exit)) {
      setEntry(id);
      setExit("");
      return;
    }
    if (id === entry) return;
    if (spotIndex(id) < spotIndex(entry)) {
      setExit(entry);
      setEntry(id);
    } else {
      setExit(id);
    }
  };

  const distance = entry && exit ? distanceBetweenSpots(entry, exit) : 0;
  const mins = parseFloat(minutes);
  const valid = distance > 0 && Number.isFinite(mins) && mins > 0;

  const selectClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 p-3 text-base text-slate-100";

  return (
    <div className="space-y-4">
      <p className="text-base text-slate-400">
        Tap your entry spot, then your exit spot (★ = the classics). Exit at
        Dreirosenbrücke at the latest — swimming in the harbour is forbidden.
      </p>

      <BaselMap entryId={entry || null} exitId={exit || null} onPick={pickSpot} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-base text-slate-300">
          Entry point
          <select
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className={`mt-1 ${selectClass}`}
          >
            <option value="">—</option>
            {BASEL_SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.popular ? "★ " : ""}
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-base text-slate-300">
          Exit point
          <select
            value={exit}
            onChange={(e) => setExit(e.target.value)}
            className={`mt-1 ${selectClass}`}
          >
            <option value="">—</option>
            {BASEL_SPOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.popular ? "★ " : ""}
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-400">
        Estimated swim distance:{" "}
        <span className="font-medium text-slate-200">
          {distance > 0 ? `${Math.round(distance)} m` : "pick entry and exit"}
        </span>
      </p>

      {[entry, exit].some(
        (id) => BASEL_SPOTS.find((s) => s.id === id)?.outsideRecommended
      ) && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
          ⚠️ Part of this stretch lies outside the official recommended
          swimming area (it starts at Schwarzwaldbrücke) — danger zone toward
          the Birsfelden lock.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-base text-slate-300">
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
        <div className="block text-base text-slate-300">
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
                className={`flex-1 p-3 text-base ${
                  effort === value
                    ? "bg-sky-600 font-medium text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Floating doubles as a current measurement — it calibrates the
            current speed below.
          </p>
        </div>
      </div>

      <button
        disabled={!valid}
        onClick={() => {
          const from = BASEL_SPOTS.find((s) => s.id === entry)!.name;
          const to = BASEL_SPOTS.find((s) => s.id === exit)!.name;
          onSubmit(
            // Self-reported swims are assumed to follow the river line, so
            // the full current acts along the route (alignment = 1).
            { distanceMeters: distance, elapsedSeconds: mins * 60, routeAlignment: 1 },
            effort,
            `${from} → ${to}`
          );
        }}
        className="w-full rounded-lg bg-sky-600 p-4 text-lg font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Calculate my swim
      </button>
    </div>
  );
}
