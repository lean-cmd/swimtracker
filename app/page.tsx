"use client";

import { useMemo, useState } from "react";
import CurrentControls from "@/components/CurrentControls";
import GpxUpload from "@/components/GpxUpload";
import ManualEntry from "@/components/ManualEntry";
import ResultsDashboard from "@/components/ResultsDashboard";
import RouteMap from "@/components/RouteMap";
import { correctForCurrent } from "@/lib/current";
import { formatDistance, formatDuration } from "@/lib/format";
import { RIVER_PRESETS } from "@/lib/rivers";
import type { ParsedTrack, SwimInput } from "@/lib/types";

type Mode = "gpx" | "manual";

export default function Home() {
  const [mode, setMode] = useState<Mode>("gpx");
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [trackLabel, setTrackLabel] = useState<string>("");
  const [manualInput, setManualInput] = useState<SwimInput | null>(null);
  const [manualLabel, setManualLabel] = useState<string>("");
  const [riverId, setRiverId] = useState(RIVER_PRESETS[0].id);
  const [currentMs, setCurrentMs] = useState(RIVER_PRESETS[0].defaultCurrentMs);

  const river = RIVER_PRESETS.find((r) => r.id === riverId)!;

  const input: SwimInput | null =
    mode === "gpx"
      ? track && {
          distanceMeters: track.distanceMeters,
          elapsedSeconds: track.elapsedSeconds,
          routeAlignment: track.routeAlignment,
        }
      : manualInput;

  const result = useMemo(
    () => (input ? correctForCurrent(input, currentMs) : null),
    [input, currentMs]
  );

  const activeLabel = mode === "gpx" ? trackLabel : manualLabel;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">
          🌊 CurrentCorrector
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          How much of your river swim was <em>you</em>, and how much was the
          river? Upload a GPS track (or log a Basel Rhine swim by entry/exit
          point) and split your distance into swimmer effort and current
          assist.
        </p>
      </header>

      {/* Input mode tabs */}
      <div className="flex overflow-hidden rounded-xl border border-slate-700">
        {(
          [
            ["gpx", "Upload GPX"],
            ["manual", "Basel: log by entry/exit"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`flex-1 p-3 text-sm font-medium ${
              mode === value
                ? "bg-slate-700 text-white"
                : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "gpx" ? (
        <GpxUpload
          onTrack={(t, name) => {
            setTrack(t);
            setTrackLabel(t.name ?? name);
          }}
        />
      ) : (
        <ManualEntry
          onSubmit={(swimInput, effort, label) => {
            setManualInput(swimInput);
            setManualLabel(label);
            if (effort === "float") {
              // A float is a free current measurement: the swimmer added no
              // speed, so GPS speed ≈ current speed. Calibrate the slider.
              setCurrentMs(swimInput.distanceMeters / swimInput.elapsedSeconds);
            }
          }}
        />
      )}

      {input && (
        <>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
            <span className="font-medium text-slate-100">{activeLabel}</span>
            {" · "}
            {formatDistance(input.distanceMeters)} in{" "}
            {formatDuration(input.elapsedSeconds)}
            {mode === "gpx" && input.routeAlignment < 0.98 && (
              <span className="text-slate-400">
                {" "}
                · route alignment {(input.routeAlignment * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {mode === "gpx" && track && <RouteMap points={track.points} />}

          <CurrentControls
            riverId={riverId}
            onRiverChange={setRiverId}
            currentMs={currentMs}
            onCurrentChange={setCurrentMs}
          />

          {result && <ResultsDashboard result={result} riverName={river.name} />}
        </>
      )}

      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        Estimates use a simplified constant-current model — see the README for
        assumptions and where real hydrological data (BAFU Rhein–Basel gauge)
        could plug in. Swim safely: use a swim buoy, keep clear of shipping,
        and exit before the harbor.
      </footer>
    </main>
  );
}
