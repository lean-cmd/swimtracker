"use client";

import { useState } from "react";
import { RIVER_PRESETS } from "@/lib/rivers";
import {
  SWIM_POSITIONS,
  currentFromDischarge,
  fetchLiveFlow,
} from "@/lib/hydro";
import { kmhToMs, msToKmh } from "@/lib/format";

/** Official canton guidance: don't swim above this discharge. */
const FLOW_WARNING_M3S = 1500;

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
  currentMs: number;
  onCurrentChange: (ms: number) => void;
  positionId: string;
  onPositionChange: (id: string) => void;
}) {
  const preset = RIVER_PRESETS.find((r) => r.id === riverId)!;
  const isBasel = riverId === "basel-rhine";
  const [flowText, setFlowText] = useState("");
  const [flowStatus, setFlowStatus] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const flow = parseFloat(flowText);
  const flowValid = Number.isFinite(flow) && flow > 0;

  const applyFlow = (q: number, source: string) => {
    setFlowText(String(Math.round(q)));
    onCurrentChange(currentFromDischarge(q));
    setFlowStatus(source);
  };

  const fetchFlow = async () => {
    setFetching(true);
    setFlowStatus(null);
    try {
      const live = await fetchLiveFlow();
      applyFlow(
        live.dischargeM3s,
        `live from data.bs.ch${live.timestamp ? ` (${live.timestamp})` : ""}`
      );
    } catch {
      setFlowStatus(
        "Couldn't reach data.bs.ch — type today's flow from the BachApp instead."
      );
    } finally {
      setFetching(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 p-2.5 text-sm text-slate-100";

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <h3 className="text-sm font-medium text-slate-200">River & current</h3>

      <label className="block text-sm text-slate-300">
        River preset
        <select
          value={riverId}
          onChange={(e) => {
            onRiverChange(e.target.value);
            const next = RIVER_PRESETS.find((r) => r.id === e.target.value);
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
      <p className="text-xs text-slate-400">{preset.description}</p>

      {isBasel && (
        <div className="space-y-2 rounded-lg border border-slate-600/60 bg-slate-900/40 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Today&apos;s flow rate
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              placeholder="e.g. 613"
              value={flowText}
              onChange={(e) => {
                setFlowText(e.target.value);
                setFlowStatus(null);
              }}
              className={inputClass}
              aria-label="Flow rate in cubic meters per second"
            />
            <button
              disabled={!flowValid}
              onClick={() => applyFlow(flow, "from your input")}
              className="shrink-0 rounded-lg bg-slate-700 px-3 text-sm text-slate-100 hover:bg-slate-600 disabled:opacity-40"
            >
              Use m³/s
            </button>
            <button
              onClick={() => void fetchFlow()}
              disabled={fetching}
              className="shrink-0 rounded-lg bg-sky-700 px-3 text-sm text-white hover:bg-sky-600 disabled:opacity-40"
            >
              {fetching ? "Fetching…" : "Fetch live"}
            </button>
          </div>
          {flowStatus && <p className="text-xs text-slate-400">{flowStatus}</p>}
          {flowValid && flow > FLOW_WARNING_M3S && (
            <p className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-300">
              ⚠️ {Math.round(flow)} m³/s is above the official guidance — the
              canton recommends swimming only below 1&apos;500 m³/s (strong
              currents, driftwood).
            </p>
          )}
          <p className="text-xs text-slate-500">
            Find it in the BachApp or on data.bs.ch (dataset 100246). The
            current speed below is derived from the flow — a rough
            cross-section estimate, not a calibrated rating curve.
          </p>
        </div>
      )}

      <div className="block text-sm text-slate-300">
        Where did you swim?
        <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-600">
          {SWIM_POSITIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPositionChange(p.id)}
              className={`flex-1 p-2 text-xs sm:text-sm ${
                positionId === p.id
                  ? "bg-sky-600 font-medium text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Water near the bank runs slower than mid-river; the choice scales the
          current ({SWIM_POSITIONS.map((p) => `${p.label} ×${p.factor}`).join(", ")}).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm text-slate-300">
          Current (m/s)
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
          Current (km/h)
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
  );
}
