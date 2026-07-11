"use client";

import { useState } from "react";
import type { CorrectionResult } from "@/lib/types";
import { formatDistance, formatPace } from "@/lib/format";
import { estimateKcal, type Sex } from "@/lib/energy";
import { buildTcx } from "@/lib/tcx";
import { buildStravaSummary } from "@/lib/summary";
import { ShareIcon, SwimmerIcon } from "./icons";
import { shareCard } from "@/lib/shareCard";
import { formatDuration as fmtDur } from "@/lib/format";

/** Numbers first, words almost never — the story is the bar and three stats. */
export default function ResultsDashboard({
  result,
  riverName,
  label = "",
  isGps = true,
  intendedFloat = false,
  vActive,
  duty,
  gaugeLaneMs,
  tempC = null,
  weightKg,
  sex,
}: {
  result: CorrectionResult;
  riverName: string;
  /** Route or track name for share text and the stat card. */
  label?: string;
  /** false when the distance came from spot-to-spot estimation, not GPS. */
  isGps?: boolean;
  /** true when the user set intensity to Float — 100% river share is intentional. */
  intendedFloat?: boolean;
  /** Speed while actively swimming, m/s (assumed or reconstructed). */
  vActive: number;
  /** Active share of the elapsed time. */
  duty: number;
  /** Today's real river speed on the swim lane, for the race chip. */
  gaugeLaneMs: number;
  tempC?: number | null;
  weightKg: number;
  sex: Sex;
}) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const kcal = estimateKcal(vActive, duty, result.elapsedSeconds, weightKg, sex);
  const displayResult =
    result.floating || vActive <= 0.05
      ? result
      : {
          ...result,
          swimmerSpeedMs: vActive,
          stillWaterPaceSecPer100m: 100 / vActive,
        };
  const summary = buildStravaSummary(displayResult, riverName, kcal, label, {
    vActive,
    gaugeLaneMs,
  });
  const raceText = result.floating
    ? "\u{1F6DF} the Rhy did the work"
    : vActive >= gaugeLaneMs
      ? "\u{1F3C6} Out-swam the Rhy!"
      : `\u{1F3C1} Rhy wins \u2014 ${Math.round((vActive / gaugeLaneMs) * 100)}% of its pace`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(summary)}`;

  // System share sheet where available; WhatsApp link otherwise.
  const shareText = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: summary });
      } catch {
        // cancelled — nothing to do
      }
      return;
    }
    window.open(whatsappHref, "_blank", "noopener");
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const makeCard = () =>
    void shareCard({
      label: label || riverName,
      youMeters: result.swimmerDistanceMeters,
      rhyMeters: result.currentDistanceMeters,
      rhyPercent: result.currentBoostPercent,
      kcal,
      durationText: fmtDur(result.elapsedSeconds),
      paceText:
        !displayResult.floating && displayResult.stillWaterPaceSecPer100m
          ? `${Math.floor(displayResult.stillWaterPaceSecPer100m / 60)}:${String(Math.round(displayResult.stillWaterPaceSecPer100m) % 60).padStart(2, "0")} /100m`
          : null,
      raceText,
      kmh: gaugeLaneMs * 3.6,
      tempC,
    });

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
      <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-500/20 via-teal-500/10 to-emerald-500/15 p-3">
        {/* the three numbers that matter */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-emerald-300">
              {formatDistance(result.swimmerDistanceMeters)}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <SwimmerIcon className="h-3.5 w-5" /> you
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-sky-300">
              {formatDistance(result.currentDistanceMeters)}
            </div>
            <div className="text-xs text-slate-400">🌊 Rhy</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-300">
              {Math.round(kcal)}
            </div>
            <div className="text-xs text-slate-400">🔥 kcal</div>
          </div>
        </div>

        {/* river vs you bar */}
        <div className="mt-2">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-800/70">
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

        {/* the race: your stroke speed vs the river itself */}
        {gaugeLaneMs > 0.05 && (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-slate-900/40 px-3 py-1 text-xs">
            {result.floating ? (
              <span className="text-slate-400">
                🌊 wins by default — you floated
              </span>
            ) : vActive >= gaugeLaneMs ? (
              <span className="text-amber-300">
                🏆 You out-swim the Rhy! {vActive.toFixed(1)} vs{" "}
                {gaugeLaneMs.toFixed(1)} m/s
              </span>
            ) : (
              <span className="text-slate-300">
                🌊 Rhy wins — you swim{" "}
                {Math.round((vActive / gaugeLaneMs) * 100)}% of its pace
              </span>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-center text-base font-semibold text-white hover:bg-green-500"
          >
            💬 WhatsApp
          </a>
          <div className="relative">
            <button
              onClick={() => setShareOpen((v) => !v)}
              aria-expanded={shareOpen}
              aria-label="More sharing options"
              className="flex items-center gap-1 rounded-xl bg-slate-700 px-4 py-2 text-base font-medium text-white hover:bg-slate-600"
            >
              <ShareIcon className="h-5 w-5" />
              <span className="text-xs">▾</span>
            </button>
            {shareOpen && (
              <div className="absolute bottom-12 right-0 z-20 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                {[
                  {
                    label: "Share…",
                    run: () => void shareText(),
                  },
                  {
                    label: "🖼 Image card",
                    run: makeCard,
                  },
                  {
                    label: copied ? "✓ Copied" : "📋 Copy text",
                    run: () => void copySummary(),
                  },
                  {
                    label: "⬇ .tcx file",
                    run: downloadTcx,
                  },
                ].map(({ label, run }) => (
                  <button
                    key={label}
                    onClick={() => {
                      run();
                      if (!label.startsWith("📋")) setShareOpen(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {result.floating && !intendedFloat && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          Today&apos;s current alone covers this pace — counted as a float 🛟
        </div>
      )}

    </section>
  );
}
