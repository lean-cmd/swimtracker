"use client";

import { useState } from "react";
import type { CorrectionResult } from "@/lib/types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from "@/lib/format";
import { activeSwimSpeed, estimateKcal, type Sex } from "@/lib/energy";
import { buildTcx } from "@/lib/tcx";
import { buildStravaSummary } from "@/lib/summary";
import StatCard from "./StatCard";

/** Numbers first, words almost never — the story is the bar and three stats. */
export default function ResultsDashboard({
  result,
  riverName,
  isGps = true,
  intendedFloat = false,
  effortLevel,
  weightKg,
  sex,
}: {
  result: CorrectionResult;
  riverName: string;
  /** false when the distance came from spot-to-spot estimation, not GPS. */
  isGps?: boolean;
  /** true when the user set effort to 1 — the 100% river share is intentional. */
  intendedFloat?: boolean;
  /** 1–4 from the intensity scale; drives the calorie duty-cycle. */
  effortLevel: number;
  weightKg: number;
  sex: Sex;
}) {
  const [copied, setCopied] = useState(false);

  const kcal = estimateKcal(
    result.swimmerSpeedMs,
    result.elapsedSeconds,
    weightKg,
    effortLevel,
    sex
  );
  // Intensity reconstructs the speed while actively swimming — EASY means
  // half the time floating, so the swimming half was twice as fast.
  const vActive = activeSwimSpeed(result.swimmerSpeedMs, effortLevel);
  const displayResult =
    result.floating || vActive <= 0.05
      ? result
      : {
          ...result,
          swimmerSpeedMs: vActive,
          stillWaterPaceSecPer100m: 100 / vActive,
        };
  const summary = buildStravaSummary(displayResult, riverName, kcal);
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(summary)}`;

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // .tcx carries distance + time + kcal into Strava / Garmin / Apple Health.
  const downloadTcx = () => {
    const xml = buildTcx({
      distanceMeters: result.gpsDistanceMeters,
      elapsedSeconds: result.elapsedSeconds,
      kcal,
      label: summary,
    });
    const url = URL.createObjectURL(
      new Blob([xml], { type: "application/vnd.garmin.tcx+xml" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "rhyschwumm.tcx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/20 via-teal-500/10 to-emerald-500/15 p-4">
        {/* the three numbers that matter */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-300">
              {formatDistance(result.swimmerDistanceMeters)}
            </div>
            <div className="text-xs text-slate-400">🏊 you</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-300">
              {formatDistance(result.currentDistanceMeters)}
            </div>
            <div className="text-xs text-slate-400">🌊 Rhy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-300">
              {Math.round(kcal)}
            </div>
            <div className="text-xs text-slate-400">🔥 kcal</div>
          </div>
        </div>

        {/* river vs you bar */}
        <div className="mt-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-800/70">
            <div
              className="bg-emerald-400"
              style={{ width: `${100 - result.currentBoostPercent}%` }}
            />
            <div
              className="bg-sky-400"
              style={{ width: `${result.currentBoostPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>
              🏊 {(100 - result.currentBoostPercent).toFixed(0)}%
              {!displayResult.floating && displayResult.stillWaterPaceSecPer100m && (
                <span className="text-slate-500">
                  {" "}
                  · {formatPace(displayResult.stillWaterPaceSecPer100m)}
                </span>
              )}
            </span>
            <span>{result.currentBoostPercent.toFixed(0)}% 🌊</span>
          </div>
        </div>

        {/* the race: your swim speed vs the river itself */}
        {result.effectiveCurrentMs > 0.05 && (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-900/40 px-3 py-1.5 text-sm">
            {result.floating ? (
              <span className="text-slate-400">
                🌊 wins by default — you floated
              </span>
            ) : vActive >= result.effectiveCurrentMs ? (
              <span className="text-amber-300">
                🏆 You out-swim the Rhy! {vActive.toFixed(1)} vs{" "}
                {result.effectiveCurrentMs.toFixed(1)} m/s
              </span>
            ) : (
              <span className="text-slate-300">
                🌊 Rhy wins — you swim{" "}
                {Math.round((vActive / result.effectiveCurrentMs) * 100)}% of
                its pace
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-green-600 px-4 py-2 text-base font-medium text-white hover:bg-green-500"
          >
            💬 Share
          </a>
          <button
            onClick={copySummary}
            className="rounded-xl bg-sky-600 px-4 py-2 text-base font-medium text-white hover:bg-sky-500"
          >
            {copied ? "✓" : "📋 Strava"}
          </button>
          <button
            onClick={downloadTcx}
            title="Download .tcx — import into Strava, Garmin or Apple Health"
            className="rounded-xl bg-slate-700 px-4 py-2 text-base font-medium text-white hover:bg-slate-600"
          >
            ⬇ .tcx
          </button>
        </div>
      </div>

      {result.floating && !intendedFloat && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Today&apos;s current alone covers this pace — counted as a float 🛟
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
          📊
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard
            label={isGps ? "GPS distance" : "Route (est.)"}
            value={formatDistance(result.gpsDistanceMeters)}
          />
          <StatCard
            label="Time"
            value={formatDuration(result.elapsedSeconds)}
          />
          <StatCard
            label="Energy"
            value={`≈ ${Math.round(kcal)} kcal`}
            highlight
          />
          <StatCard
            label={isGps ? "GPS speed" : "Speed over ground"}
            value={formatSpeed(result.gpsSpeedMs)}
            sub={formatPace(result.gpsPaceSecPer100m)}
          />
          <StatCard
            label="Current along route"
            value={`${result.effectiveCurrentMs.toFixed(2)} m/s`}
          />
          <StatCard
            label="Speed while swimming"
            value={
              displayResult.floating
                ? "~0 m/s"
                : formatSpeed(displayResult.swimmerSpeedMs)
            }
            sub={
              displayResult.stillWaterPaceSecPer100m
                ? formatPace(displayResult.stillWaterPaceSecPer100m)
                : undefined
            }
            highlight
          />
        </div>
        <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-300">
          {summary}
        </pre>
      </details>
    </section>
  );
}
