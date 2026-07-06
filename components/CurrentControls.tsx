"use client";

import { RIVER_PRESETS } from "@/lib/rivers";
import { kmhToMs, msToKmh } from "@/lib/format";

export default function CurrentControls({
  riverId,
  onRiverChange,
  currentMs,
  onCurrentChange,
}: {
  riverId: string;
  onRiverChange: (id: string) => void;
  currentMs: number;
  onCurrentChange: (ms: number) => void;
}) {
  const preset = RIVER_PRESETS.find((r) => r.id === riverId)!;
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
      <p className="text-xs text-slate-500">
        Basel Rhine typically runs ~1–2.5 m/s depending on discharge. Check the
        BAFU gauge (station 2289, Rhein–Basel) for today&apos;s conditions.
      </p>
    </div>
  );
}
