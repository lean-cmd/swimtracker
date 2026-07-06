"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RIVER_PRESETS } from "@/lib/rivers";
import {
  FLOW_WARNING_M3S,
  HIGH_FLOW_M3S,
  SWIM_POSITIONS,
  fetchLiveFlow,
  midstreamCurrentFromDischarge,
} from "@/lib/hydro";
import { kmhToMs, msToKmh } from "@/lib/format";

type FlowState =
  | { status: "loading" }
  | { status: "live"; q: number; when: string | null }
  | { status: "manual"; q: number }
  | { status: "error" };

export default function CurrentControls({
  riverId,
  onRiverChange,
  currentMs,
  onCurrentChange,
  positionId,
  onPositionChange,
}: {
  riverId: string;
  onRiverChange: (id: string) => void;
  /** Midstream current; the position factor is applied by the caller. */
  currentMs: number;
  onCurrentChange: (ms: number) => void;
  positionId: string;
  onPositionChange: (id: string) => void;
}) {
  const preset = RIVER_PRESETS.find((r) => r.id === riverId)!;
  const isBasel = riverId === "basel-rhine";
  const [flow, setFlow] = useState<FlowState>({ status: "loading" });
  const [flowText, setFlowText] = useState("");
  const fetchedOnce = useRef(false);

  const applyDischarge = useCallback(
    (q: number) => onCurrentChange(midstreamCurrentFromDischarge(q)),
    [onCurrentChange]
  );

  // Really simple UX: fetch today's flow automatically, once, on load.
  useEffect(() => {
    if (!isBasel || fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchLiveFlow()
      .then((live) => {
        setFlow({ status: "live", q: live.dischargeM3s, when: live.timestamp });
        setFlowText(String(Math.round(live.dischargeM3s)));
        applyDischarge(live.dischargeM3s);
      })
      .catch(() => setFlow({ status: "error" }));
  }, [isBasel, applyDischarge]);

  const q =
    flow.status === "live" || flow.status === "manual" ? flow.q : null;

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 p-2.5 text-sm text-slate-100";

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <h3 className="text-sm font-medium text-slate-200">River & current</h3>

      {isBasel ? (
        <div className="space-y-2">
          {/* one-line flow status — the whole UX for most swims */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/60 bg-slate-900/40 p-3 text-sm">
            {flow.status === "loading" && (
              <span className="text-slate-400">
                Fetching today&apos;s Rhine flow from data.bs.ch…
              </span>
            )}
            {flow.status === "live" && (
              <span className="text-slate-200">
                🌊 Rhine now: <strong>{Math.round(flow.q)} m³/s</strong> →
                midstream ≈ {midstreamCurrentFromDischarge(flow.q).toFixed(2)}{" "}
                m/s{" "}
                <span className="text-xs text-slate-500">
                  (live{flow.when ? `, ${flow.when}` : ""})
                </span>
              </span>
            )}
            {flow.status === "manual" && (
              <span className="text-slate-200">
                🌊 Flow set to <strong>{Math.round(flow.q)} m³/s</strong> →
                midstream ≈ {midstreamCurrentFromDischarge(flow.q).toFixed(2)}{" "}
                m/s
              </span>
            )}
            {flow.status === "error" && (
              <span className="text-amber-300">
                Couldn&apos;t reach data.bs.ch — enter today&apos;s flow from
                the BachApp:
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="flow in m³/s, e.g. 613"
              value={flowText}
              onChange={(e) => setFlowText(e.target.value)}
              className={inputClass}
              aria-label="Flow rate in cubic meters per second"
            />
            <button
              disabled={!(parseFloat(flowText) > 0)}
              onClick={() => {
                const v = parseFloat(flowText);
                setFlow({ status: "manual", q: v });
                applyDischarge(v);
              }}
              className="shrink-0 rounded-lg bg-sky-700 px-3 text-sm text-white hover:bg-sky-600 disabled:opacity-40"
            >
              Use m³/s
            </button>
          </div>

          {q !== null && q > FLOW_WARNING_M3S && (
            <p className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-300">
              ⚠️ {Math.round(q)} m³/s — the canton recommends swimming only
              below 1&apos;500 m³/s (strong currents, driftwood). Estimates are
              also less reliable up here.
            </p>
          )}
          {q !== null && q > HIGH_FLOW_M3S && q <= FLOW_WARNING_M3S && (
            <p className="text-xs text-amber-300">
              High flow — the current estimate is extrapolated, treat results
              with extra caution.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">{preset.description}</p>
      )}

      <div className="block text-sm text-slate-300">
        Where did you mostly swim?
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {SWIM_POSITIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPositionChange(p.id)}
              className={`rounded-lg border p-2 text-xs sm:text-sm ${
                positionId === p.id
                  ? "border-sky-500 bg-sky-600 font-medium text-white"
                  : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          The bank runs slower than midstream (Kleinbasel is the inside of the
          bend). Your pick scales the current: {" "}
          {SWIM_POSITIONS.map((p) => `×${p.factor}`).join(" / ")}.
        </p>
      </div>

      {/* advanced: direct current control + other rivers */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-200">
          Advanced: set current speed manually / other river
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block text-sm text-slate-300">
            River preset
            <select
              value={riverId}
              onChange={(e) => {
                onRiverChange(e.target.value);
                const next = RIVER_PRESETS.find(
                  (r) => r.id === e.target.value
                );
                if (next) onCurrentChange(next.defaultCurrentMs);
              }}
              className={`mt-1 ${inputClass}`}
            >
              {RIVER_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-300">
              Midstream current (m/s)
              <input
                type="number"
                min="0"
                max="4"
                step="0.1"
                value={Number(currentMs.toFixed(2))}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v >= 0) onCurrentChange(v);
                }}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="block text-sm text-slate-300">
              Midstream current (km/h)
              <input
                type="number"
                min="0"
                max="15"
                step="0.1"
                value={Number(msToKmh(currentMs).toFixed(2))}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v >= 0) onCurrentChange(kmhToMs(v));
                }}
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={currentMs}
            onChange={(e) => onCurrentChange(parseFloat(e.target.value))}
            className="w-full accent-sky-500"
            aria-label="Current speed slider"
          />
        </div>
      </details>
    </div>
  );
}
