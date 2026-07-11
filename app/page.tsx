"use client";

import { useEffect, useMemo, useState } from "react";
import EffortScale from "@/components/EffortScale";
import FlowChip from "@/components/FlowChip";
import ImportSheet from "@/components/ImportSheet";
import LogSwim from "@/components/LogSwim";
import ProfileSettings, {
  loadProfile,
  saveProfile,
  type Profile,
} from "@/components/ProfileSettings";
import ResultsDashboard from "@/components/ResultsDashboard";
import RouteMap from "@/components/RouteMap";
import { correctForCurrent, resultFromIntensity } from "@/lib/current";
import { DEFAULT_WEIGHT_KG, INTENSITY, clampLevel } from "@/lib/energy";
import { SWIM_LANE_FACTOR } from "@/lib/hydro";
import { useRhineFlow } from "@/lib/useRhineFlow";
import { RIVER_PRESETS } from "@/lib/rivers";
import type { ParsedTrack, SwimInput } from "@/lib/types";

export default function Home() {
  const [track, setTrack] = useState<ParsedTrack | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackLabel, setTrackLabel] = useState<string>("");
  const [logInput, setLogInput] = useState<SwimInput | null>(null);
  const [logLabel, setLogLabel] = useState<string>("");
  const [effort, setEffort] = useState(3); // 1 float … 4 hard
  const [profile, setProfile] = useState<Profile>({
    weightKg: DEFAULT_WEIGHT_KG,
    sex: "u",
  });
  const flow = useRhineFlow();

  // Personal data lives on-device only.
  useEffect(() => setProfile(loadProfile(DEFAULT_WEIGHT_KG)), []);
  const updateProfile = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
  };
  const currentMs = flow.currentMs;

  const river = RIVER_PRESETS[0];
  const intendedFloat = effort === 1;
  const level = INTENSITY[clampLevel(effort)];

  // Imported tracks calculate from data (current subtracted from GPS);
  // logged swims run intensity-forward (your strokes fix your share,
  // the river's share is deduced). Float attributes everything to the Rhy.
  const result = useMemo(() => {
    if (track) {
      const input: SwimInput = {
        distanceMeters: track.distanceMeters,
        elapsedSeconds: track.elapsedSeconds,
        routeAlignment: track.routeAlignment,
      };
      const effective = intendedFloat
        ? input.distanceMeters / input.elapsedSeconds / input.routeAlignment
        : currentMs * SWIM_LANE_FACTOR;
      return correctForCurrent(input, effective);
    }
    if (!logInput) return null;
    return resultFromIntensity(logInput, effort);
  }, [track, logInput, effort, currentMs, intendedFloat]);

  // Speed while actively swimming: assumed strokes in log mode; in GPX mode
  // reconstructed from the measured average and the duty-cycle.
  const vActive = track
    ? result && level.duty > 0
      ? result.swimmerSpeedMs / level.duty
      : 0
    : level.strokeMs;

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-2xl flex-col gap-2 overflow-y-auto px-4 pb-1 pt-2">
      <header className="flex items-center justify-between gap-2">
        <h1 className="whitespace-nowrap bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
          🌊 Rhyschwumm
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-base text-slate-300 hover:text-white"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setImportOpen(true);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  ⤒ Import from Strava or file
                </button>
              </div>
            )}
          </div>
          <ProfileSettings profile={profile} onChange={updateProfile} />
        </div>
      </header>

      {importOpen && (
        <ImportSheet
          onTrack={(t, name) => {
            setTrack(t);
            setTrackLabel(t.name ?? name);
          }}
          onClose={() => setImportOpen(false)}
        />
      )}

      {track ? (
        <div className="space-y-3">
          <div className="relative">
            <RouteMap points={track.points} />
            <div className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300 backdrop-blur-[2px]">
              <span className="max-w-[220px] truncate">{trackLabel}</span>
              <button
                onClick={() => setTrack(null)}
                aria-label="Remove imported track"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex">
            <EffortScale value={effort} onChange={setEffort} />
          </div>
          <FlowChip flow={flow} />
        </div>
      ) : (
        <LogSwim
          effort={effort}
          onEffortChange={setEffort}
          onChange={(swimInput, swimLabel) => {
            setLogInput(swimInput);
            setLogLabel(swimLabel);
          }}
          flow={flow}
        />
      )}

      {result && (
        <ResultsDashboard
          result={result}
          riverName={river.name}
          label={track ? trackLabel : logLabel}
          isGps={!!track}
          intendedFloat={intendedFloat}
          vActive={vActive}
          duty={level.duty}
          gaugeLaneMs={currentMs * SWIM_LANE_FACTOR}
          tempC={flow.tempC}
          weightKg={profile.weightKg}
          sex={profile.sex}
        />
      )}

      <footer className="mt-auto pt-1 text-center text-[10px] text-slate-600">
        gmacht z&apos;Basel am Rhy 🇨🇭 ·{" "}
        <a
          href="https://www.bs.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          bs.ch
        </a>{" "}
        ·{" "}
        <a
          href="https://www.bachapp.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          BachApp
        </a>
      </footer>
    </main>
  );
}
