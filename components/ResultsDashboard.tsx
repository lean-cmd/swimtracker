"use client";

import { useState } from "react";
import type { CorrectionResult } from "@/lib/types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from "@/lib/format";
import { buildStravaSummary } from "@/lib/summary";
import StatCard from "./StatCard";

export default function ResultsDashboard({
  result,
  riverName,
  isGps = true,
}: {
  result: CorrectionResult;
  riverName: string;
  /** false when the distance came from spot-to-spot estimation, not GPS. */
  isGps?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const summary = buildStravaSummary(result, riverName);

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Results</h2>
        <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          experimental estimate
        </span>
      </div>

      {result.floating && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200">
          The configured current fully explains your GPS speed — the model
          thinks you were <strong>floating/drifting</strong>. Your GPS speed
          implies a current of about{" "}
          <strong>{result.impliedCurrentMs.toFixed(2)} m/s</strong>. If you
          were actually swimming, lower the current speed setting.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label={isGps ? "GPS distance" : "Route distance (est.)"}
          value={formatDistance(result.gpsDistanceMeters)}
        />
        <StatCard
          label="Elapsed time"
          value={formatDuration(result.elapsedSeconds)}
        />
        <StatCard
          label={isGps ? "Avg GPS speed" : "Avg speed over ground"}
          value={formatSpeed(result.gpsSpeedMs)}
          sub={formatPace(result.gpsPaceSecPer100m)}
        />
        <StatCard
          label="Current-assisted distance"
          value={formatDistance(result.currentDistanceMeters)}
          sub={`at ${result.effectiveCurrentMs.toFixed(2)} m/s along route`}
        />
        <StatCard
          label="Swimmer-powered distance"
          value={formatDistance(result.swimmerDistanceMeters)}
          highlight
        />
        <StatCard
          label="Speed through water"
          value={result.floating ? "~0 m/s" : formatSpeed(result.swimmerSpeedMs)}
          highlight
        />
        <StatCard
          label="Still-water pace"
          value={
            result.stillWaterPaceSecPer100m
              ? formatPace(result.stillWaterPaceSecPer100m)
              : "—"
          }
          sub="effort-equivalent pace in a pool"
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
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>River {result.currentBoostPercent.toFixed(0)}%</span>
          <span>You {(100 - result.currentBoostPercent).toFixed(0)}%</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-700">
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
          <h3 className="text-sm font-medium text-slate-200">
            Strava description
          </h3>
          <button
            onClick={copySummary}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
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
