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
  intendedFloat = false,
  weightKg,
  onWeightChange,
}: {
  result: CorrectionResult;
  riverName: string;
  /** false when the distance came from spot-to-spot estimation, not GPS. */
  isGps?: boolean;
  /** true when the user said they floated — the 100% river share is intentional. */
  intendedFloat?: boolean;
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
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(summary)}`;

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-3">
      {/* the story, in one fun card */}
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/20 via-teal-500/10 to-emerald-500/15 p-4">
        <div className="text-lg leading-relaxed text-slate-50">
          {result.floating ? (
            <>
              🛟 The Rhy did the work — it carried you{" "}
              <strong>{formatDistance(result.gpsDistanceMeters)}</strong> in{" "}
              <strong>{formatDuration(result.elapsedSeconds)}</strong>. What a
              float!
            </>
          ) : (
            <>
              💪 You swam{" "}
              <strong>{formatDistance(result.swimmerDistanceMeters)}</strong>{" "}
              yourself — the Rhy carried the other{" "}
              <strong>{formatDistance(result.currentDistanceMeters)}</strong> (
              {result.currentBoostPercent.toFixed(0)}%). Pool pace:{" "}
              <strong>{formatPace(result.stillWaterPaceSecPer100m!)}</strong>.
            </>
          )}{" "}
          🔥 ~<strong>{Math.round(kcal)} kcal</strong>
        </div>

        {/* river vs you bar */}
        <div className="mt-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-800/70">
            <div
              className="bg-sky-400"
              style={{ width: `${result.currentBoostPercent}%` }}
            />
            <div
              className="bg-emerald-400"
              style={{ width: `${100 - result.currentBoostPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>🌊 Rhy {result.currentBoostPercent.toFixed(0)}%</span>
            <span>you {(100 - result.currentBoostPercent).toFixed(0)}% 🏊</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-green-600 px-4 py-2 text-base font-medium text-white hover:bg-green-500"
          >
            Share on WhatsApp 💬
          </a>
          <button
            onClick={copySummary}
            className="rounded-xl bg-sky-600 px-4 py-2 text-base font-medium text-white hover:bg-sky-500"
          >
            {copied ? "Copied ✓" : "Copy for Strava"}
          </button>
          <label className="ml-auto inline-flex items-center gap-1 text-sm text-slate-400">
            ⚖️
            <input
              type="number"
              min="30"
              max="200"
              value={weightKg}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v > 0) onWeightChange(v);
              }}
              className="w-16 rounded-lg border border-slate-600 bg-slate-800 p-1.5 text-sm text-slate-100"
              aria-label="Your weight in kilograms"
            />
            kg
          </label>
        </div>
      </div>

      {result.floating && !intendedFloat && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          The current alone explains your speed — if you were really swimming,
          lower the current under &quot;adjust&quot; (your speed implies ~
          {result.impliedCurrentMs.toFixed(2)} m/s).
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
          All the numbers{" "}
          <span className="text-xs text-slate-500">
            (experimental estimate)
          </span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
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
            value={
              result.floating ? "~0 m/s" : formatSpeed(result.swimmerSpeedMs)
            }
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
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-300">
          {summary}
        </pre>
      </details>
    </section>
  );
}
