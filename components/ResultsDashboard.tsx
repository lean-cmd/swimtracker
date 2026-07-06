"use client";

import { useState } from "react";
import type { CorrectionResult } from "@/lib/types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from "@/lib/format";
import { estimateKcal } from "@/lib/energy";
import { buildStravaSummary } from "@/lib/summary";
import StatCard from "./StatCard";

export default function ResultsDashboard({
  result,
  riverName,
  isGps = true,
  weightKg,
  onWeightChange,
}: {
  result: CorrectionResult;
  riverName: string;
  /** false when the distance came from spot-to-spot estimation, not GPS. */
  isGps?: boolean;
  weightKg: number;
  onWeightChange: (kg: number) => void;
}) {
  const [copied, setCopied] = useState(false);

  const kcal = estimateKcal(
    result.swimmerSpeedMs,
    result.elapsedSeconds,
    weightKg
  );
  const summary = buildStravaSummary(result, riverName, kcal);

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-100">Your swim</h2>
        <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          experimental estimate
        </span>
      </div>

      {/* the answer in one breath, before any numbers grid */}
      <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-lg leading-relaxed text-slate-100">
        {result.floating ? (
          <>
            The river did the work today — you drifted{" "}
            <strong>{formatDistance(result.gpsDistanceMeters)}</strong> in{" "}
            <strong>{formatDuration(result.elapsedSeconds)}</strong>. A lovely
            float! 🛟
          </>
        ) : (
          <>
            You swam <strong>{formatDistance(result.swimmerDistanceMeters)}</strong>{" "}
            with your own power — the river carried you the other{" "}
            <strong>{formatDistance(result.currentDistanceMeters)}</strong>.
            In a pool, your effort would be about{" "}
            <strong>{formatPace(result.stillWaterPaceSecPer100m!)}</strong>. 🏊
          </>
        )}{" "}
        You burned roughly <strong>{Math.round(kcal)} kcal</strong>.
      </div>

      {result.floating && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200">
          The current alone explains your speed. If you were actually
          swimming, the current setting is too high — your speed implies about{" "}
          <strong>{result.impliedCurrentMs.toFixed(2)} m/s</strong> of current.
        </div>
      )}

      <label className="flex items-center gap-2 text-base text-slate-300">
        Your weight:
        <input
          type="number"
          min="30"
          max="200"
          value={weightKg}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v > 0) onWeightChange(v);
          }}
          className="w-20 rounded-lg border border-slate-600 bg-slate-800 p-2 text-base text-slate-100"
        />
        kg <span className="text-sm text-slate-500">(for the calories)</span>
      </label>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label={isGps ? "GPS distance" : "Route distance (est.)"}
          value={formatDistance(result.gpsDistanceMeters)}
        />
        <StatCard
          label="Time in the water"
          value={formatDuration(result.elapsedSeconds)}
        />
        <StatCard
          label="Energy burned"
          value={`≈ ${Math.round(kcal)} kcal`}
          sub="from your effort & weight"
          highlight
        />
        <StatCard
          label={isGps ? "Avg GPS speed" : "Avg speed over ground"}
          value={formatSpeed(result.gpsSpeedMs)}
          sub={formatPace(result.gpsPaceSecPer100m)}
        />
        <StatCard
          label="River's share"
          value={formatDistance(result.currentDistanceMeters)}
          sub={`current ${result.effectiveCurrentMs.toFixed(2)} m/s along your route`}
        />
        <StatCard
          label="Your share"
          value={formatDistance(result.swimmerDistanceMeters)}
          highlight
        />
        <StatCard
          label="Your speed in the water"
          value={result.floating ? "~0 m/s" : formatSpeed(result.swimmerSpeedMs)}
          highlight
        />
        <StatCard
          label="Pool-equivalent pace"
          value={
            result.stillWaterPaceSecPer100m
              ? formatPace(result.stillWaterPaceSecPer100m)
              : "—"
          }
          sub="same effort in still water"
          highlight
        />
        <StatCard
          label="Current boost"
          value={`${result.currentBoostPercent.toFixed(0)}%`}
          sub="share of distance from the river"
        />
      </div>

      {/* Visual split of river vs swimmer contribution */}
      <div>
        <div className="mb-1 flex justify-between text-sm text-slate-400">
          <span>River {result.currentBoostPercent.toFixed(0)}%</span>
          <span>You {(100 - result.currentBoostPercent).toFixed(0)}%</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-700">
          <div
            className="bg-sky-400"
            style={{ width: `${result.currentBoostPercent}%` }}
          />
          <div
            className="bg-emerald-400"
            style={{ width: `${100 - result.currentBoostPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-medium text-slate-200">
            Text for Strava
          </h3>
          <button
            onClick={copySummary}
            className="rounded-lg bg-sky-600 px-4 py-2 text-base font-medium text-white hover:bg-sky-500"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
          {summary}
        </pre>
      </div>
    </section>
  );
}
