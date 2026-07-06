"use client";

import { useMemo, useState } from "react";
import CurrentControls from "@/components/CurrentControls";
import GpxUpload from "@/components/GpxUpload";
import LogSwim from "@/components/LogSwim";
import ResultsDashboard from "@/components/ResultsDashboard";
import RouteMap from "@/components/RouteMap";
import StravaLink from "@/components/StravaLink";
import { correctForCurrent } from "@/lib/current";
import { formatDistance, formatDuration } from "@/lib/format";
import { SWIM_POSITIONS } from "@/lib/hydro";
import { RIVER_PRESETS } from "@/lib/rivers";
import type { ParsedTrack, SwimInput } from "@/lib/types";

type Mode = "log" | "gpx";

export default function Home() {
  const [mode, setMode] = useState<Mode>("log");
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [trackLabel, setTrackLabel] = useState<string>("");
  const [logInput, setLogInput] = useState<SwimInput | null>(null);
  const [logLabel, setLogLabel] = useState<string>("");
  const [riverId, setRiverId] = useState(RIVER_PRESETS[0].id);
  const [currentMs, setCurrentMs] = useState(RIVER_PRESETS[0].defaultCurrentMs);
  const [positionId, setPositionId] = useState("corridor");

  const river = RIVER_PRESETS.find((r) => r.id === riverId)!;
  const positionFactor =
    SWIM_POSITIONS.find((p) => p.id === positionId)?.factor ?? 1;

  const input: SwimInput | null =
    mode === "gpx"
      ? track && {
          distanceMeters: track.distanceMeters,
          elapsedSeconds: track.elapsedSeconds,
          routeAlignment: track.routeAlignment,
        }
      : logInput;

  // The controls hold the base (typical-line) current; where the swimmer
  // actually was in the channel scales it before the correction runs.
  const result = useMemo(
    () => (input ? correctForCurrent(input, currentMs * positionFactor) : null),
    [input, currentMs, positionFactor]
  );

  const activeLabel = mode === "gpx" ? trackLabel : logLabel;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">
          🌊 CurrentCorrector
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          For Basel Rhine swimmers: how much of your swim was <em>you</em>,
          and how much was the river? Log your swim by entry/exit spot — or
          upload a GPS track — and split the distance into swimmer effort and
          current assist, using today&apos;s actual flow.
        </p>
      </header>

      {/* Input mode tabs — self-reported first: trackers struggle in the Rhine */}
      <div className="flex overflow-hidden rounded-xl border border-slate-700">
        {(
          [
            ["log", "Log a swim (Basel)"],
            ["gpx", "GPX file / Strava link"],
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

      {mode === "log" ? (
        <LogSwim
          onSubmit={(swimInput, effort, label) => {
            setLogInput(swimInput);
            setLogLabel(label);
            if (effort === "float") {
              // A float is a free current measurement: the swimmer added no
              // speed, so drift speed ≈ current at their line in the channel.
              // Store the equivalent base (typical-line) current.
              setCurrentMs(
                swimInput.distanceMeters /
                  swimInput.elapsedSeconds /
                  positionFactor
              );
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          <GpxUpload
            onTrack={(t, name) => {
              setTrack(t);
              setTrackLabel(t.name ?? name);
            }}
          />
          <StravaLink />
        </div>
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
            positionId={positionId}
            onPositionChange={setPositionId}
          />

          {result && (
            <ResultsDashboard
              result={result}
              riverName={river.name}
              isGps={mode === "gpx"}
            />
          )}
        </>
      )}

      <footer className="space-y-1 border-t border-slate-800 pt-4 text-xs text-slate-500">
        <p>
          Estimates use a simplified current model — see the README for
          assumptions and how live data.bs.ch flow data plugs in.
        </p>
        <p>
          Official rules (bs.ch): swim only below 1&apos;500 m³/s and above
          18 °C water, no swimming in harbour areas or at the Birsfelden lock,
          no jumping from bridges, use a swim bag (not tied to your body).
        </p>
      </footer>
    </main>
  );
}
