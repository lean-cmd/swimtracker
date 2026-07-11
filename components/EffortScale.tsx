"use client";

import { INTENSITY } from "@/lib/energy";

/**
 * Intensity as a finger slider: Float · Pauses · Steady · Strong.
 * The thumb is oversized for touch; labels double as tap targets.
 */
export default function EffortScale({
  value,
  onChange,
}: {
  value: number; // 1–4
  onChange: (level: number) => void;
}) {
  return (
    <div className="flex h-full flex-1 flex-col justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-3 pb-0.5 pt-1.5">
      <input
        type="range"
        min="1"
        max="4"
        step="1"
        value={value}
        aria-label="Swim intensity"
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="intensity-slider w-full"
      />
      <div className="flex justify-between text-[10px] uppercase tracking-wide">
        {[1, 2, 3, 4].map((l) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`px-1 py-0.5 ${
              value === l ? "font-bold text-sky-300" : "text-slate-500"
            }`}
          >
            {INTENSITY[l].label}
          </button>
        ))}
      </div>
    </div>
  );
}
