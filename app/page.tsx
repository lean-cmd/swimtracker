"use client";

import { useMemo, useState } from "react";
import EffortScale from "@/components/EffortScale";
import FlowChip from "@/components/FlowChip";
import GpxUpload from "@/components/GpxUpload";
import LogSwim from "@/components/LogSwim";
import ResultsDashboard from "@/components/ResultsDashboard";
import RouteMap from "@/components/RouteMap";
import StravaLink from "@/components/StravaLink";
import { correctForCurrent } from "@/lib/current";
import { DEFAULT_WEIGHT_KG } from "@/lib/energy";
import { SWIM_LANE_FACTOR } from "@/lib/hydro";
import { useRhineFlow } from "@/lib/useRhineFlow";
import { RIVER_PRESETS } from "@/lib/rivers";
import type { ParsedTrack, SwimInput } from "@/lib/types";

type Mode = "log" | "gpx";

export default function Home() {
  const [mode, setMode] = useState<Mode>("log");
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [trackLabel, setTrackLabel] = useState<string>("");
  const [logInput, setLogInput] = useState<SwimInput | null>(null);
  const [effort, setEffort] = useState(3); // 1 float … 4 hard
  const [weightKg, setWeightKg] = useState(DEFAULT_WEIGHT_KG);
  const flow = useRhineFlow();
  const currentMs = flow.currentMs;

  const river = RIVER_PRESETS[0];
  const intendedFloat = effort === 1;

  const input: SwimInput | null =
    mode === "gpx"
      ? track && {
          distanceMeters: track.distanceMeters,
          elapsedSeconds: track.elapsedSeconds,
          routeAlignment: track.routeAlignment,
        }
      : logInput;

  // Effort 1 ("I floated") means the drift IS the current — the model then
  // attributes everything to the river, whatever the flow data says.
  const result = useMemo(() => {
    if (!input) return null;
    const effective = intendedFloat
      ? input.distanceMeters / input.elapsedSeconds / input.routeAlignment
      : currentMs * SWIM_LANE_FACTOR;
    return correctForCurrent(input, effective);
  }, [input, currentMs, intendedFloat]);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="whitespace-nowrap bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
          🌊 Rhyschwumm
        </h1>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-slate-700 text-xs">
          {(
            [
              ["log", "📝 Log"],
              ["gpx", "📍 GPX"],
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
          effort={effort}
          onEffortChange={setEffort}
          onChange={(swimInput) => setLogInput(swimInput)}
          flow={flow}
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
          {track && <EffortScale value={effort} onChange={setEffort} />}
          <FlowChip flow={flow} />
        </div>
      )}

      {input && result && (
        <>
          {mode === "gpx" && (
            <div className="text-sm text-slate-400">{trackLabel}</div>
          )}
          <ResultsDashboard
            result={result}
            riverName={river.name}
            isGps={mode === "gpx"}
            intendedFloat={intendedFloat}
            effortLevel={effort}
            weightKg={weightKg}
            onWeightChange={setWeightKg}
          />
        </>
      )}

      <footer className="border-t border-slate-800 pt-2 text-center text-[11px] text-slate-600">
        ≈ estimates ·{" "}
        <a
          href="https://www.bs.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          bs.ch rules
        </a>{" "}
        · data.bs.ch
      </footer>
    </main>
  );
}
