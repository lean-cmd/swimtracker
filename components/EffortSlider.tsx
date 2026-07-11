"use client";

/**
 * 5-point effort scale, emoji only. Level 1 = floated (the river did it all);
 * 5 = full send. Drives the calorie estimate and the float attribution.
 */
export const EFFORT_EMOJI = ["🛟", "😌", "🙂", "💪", "🔥"];

export default function EffortSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (level: number) => void;
}) {
  return (
    <div className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5">
      <div className="flex justify-between text-base leading-none">
        {EFFORT_EMOJI.map((e, i) => (
          <button
            key={e}
            onClick={() => onChange(i + 1)}
            aria-label={`Effort level ${i + 1}`}
            className={`transition-transform ${
              value === i + 1 ? "scale-150" : "opacity-40 hover:opacity-80"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        aria-label="Effort level"
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-1 w-full accent-sky-500"
      />
    </div>
  );
}
