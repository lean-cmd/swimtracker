"use client";

import { INTENSITY, describeIntensity } from "@/lib/energy";

/**
 * Continuous intensity slider: anchors at Float / Pauses / Steady / Strong,
 * but any position between them counts — stroke speed and active share
 * interpolate. A one-line description narrates the current position.
 */
export default function EffortScale({
  value,
  onChange,
}: {
  value: number; // 1.0 – 4.0, continuous
  onChange: (level: number) => void;
}) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5">
      <input
        type="range"
        min="1"
        max="4"
        step="0.05"
        value={value}
        aria-label="Swim intensity"
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="intensity-slider w-full"
      />
      {/* fixed-width cells + constant font weight: highlighting must never
          change layout (CLS) while the thumb crosses an anchor */}
      <div className="flex h-4 text-[11px] font-semibold uppercase leading-4 tracking-wide">
        {[1, 2, 3, 4].map((l) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`w-1/4 ${
              l === 1 ? "text-left" : l === 4 ? "text-right" : "text-center"
            } ${
              Math.abs(value - l) <= 0.5 ? "text-sky-300" : "text-slate-500/80"
            }`}
          >
            {INTENSITY[l].label}
          </button>
        ))}
      </div>
      <div className="h-4 truncate text-center text-[10px] leading-4 text-slate-400">
        {describeIntensity(value)}
      </div>
    </div>
  );
}
