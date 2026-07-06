"use client";

import { useMemo, useState } from "react";
import CurrentControls from "@/components/CurrentControls";
import GpxUpload from "@/components/GpxUpload";
import LogSwim, { type Effort } from "@/components/LogSwim";
import ResultsDashboard from "@/components/ResultsDashboard";
import RouteMap from "@/components/RouteMap";
import StravaLink from "@/components/StravaLink";
import { correctForCurrent } from "@/lib/current";
import { DEFAULT_WEIGHT_KG } from "@/lib/energy";
import { SWIM_LANE_FACTOR } from "@/lib/hydro";
import { RIVER_PRESETS } from "@/lib/rivers";
import type { ParsedTrack, SwimInput } from "@/lib/types";

type Mode = "log" | "gpx";

export default function Home() {
  const [mode, setMode] = useState<Mode>("log");
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [trackLabel, setTrackLabel] = useState<string>("");
  const [logInput, setLogInput] = useState<SwimInput | null>(null);
  const [logLabel, setLogLabel] = useState<string>("");
  const [effort, setEffort] = useState<Effort>("swim");
  const [currentMs, setCurrentMs] = useState(RIVER_PRESETS[0].defaultCurrentMs);
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);

  const river = RIVER_PRESETS[0];

  const input: SwimInput | null =
    mode === "gpx"
      ? track && {
          distanceMeters: track.distanceMeters,
          elapsedSeconds: track.elapsedSeconds,
          routeAlignment: track.routeAlignment,
        }
      : logInput;

  // "I floated" means the drift IS the current — the model then attributes
  // everything to the river, whatever the flow data says.
  const result = useMemo(() => {
    if (!input) return null;
    const intendedFloat = mode === "log" && effort === "float";
    const effective = intendedFloat
      ? input.distanceMeters / input.elapsedSeconds / input.routeAlignment
      : currentMs * SWIM_LANE_FACTOR;
    return correctForCurrent(input, effective);
  }, [input, currentMs, mode, effort]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="whitespace-nowrap bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
          🌊 Rhyschwumm
        </h1>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-700 text-xs">
          {(
            [
              ["log", "Log a Schwumm"],
              ["gpx", "GPX / Strava"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`whitespace-nowrap px-2.5 py-1.5 ${
                mode === value
                  ? "bg-sky-600 font-medium text-white"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {mode === "log" ? (
        <LogSwim
          onChange={(swimInput, nextEffort, label) => {
            setLogInput(swimInput);
            setLogLabel(label);
            setEffort(nextEffort);
          }}
        />
      ) : (
        <div className="space-y-3">
          <GpxUpload
            onTrack={(t, name) => {
              setTrack(t);
              setTrackLabel(t.name ?? name);
            }}
          />
          <StravaLink />
          {track && <RouteMap points={track.points} />}
        </div>
      )}

      <CurrentControls currentMs={currentMs} onCurrentChange={setCurrentMs} />

      {input && result && (
        <>
          {mode === "gpx" && (
            <div className="text-sm text-slate-400">{trackLabel}</div>
          )}
          <ResultsDashboard
            result={result}
            riverName={river.name}
            isGps={mode === "gpx"}
            intendedFloat={mode === "log" && effort === "float"}
            weightKg={weightKg}
            onWeightChange={setWeightKg}
          />
        </>
      )}

      <footer className="border-t border-slate-800 pt-3 text-xs text-slate-500">
        {logLabel && mode === "log" ? `${logLabel} · ` : ""}Experimental
        estimates — not scientific truth. Official rules (bs.ch): no swimming
        above 1&apos;500 m³/s, in the harbour or at the Birsfelden lock; no
        bridge jumping; take a swim bag. Data: data.bs.ch (dataset 100089).
      </footer>
    </main>
  );
}
