"use client";

/**
 * 4-point swim effort scale, text only. FLOAT means the river did it all
 * (drives the float attribution); the rest adjust the calorie model's
 * efficiency factor — same speed fought harder burns more.
 */
export const EFFORT_LABELS = ["Float", "Easy", "Steady", "Hard"];

export default function EffortScale({
  value,
  onChange,
}: {
  value: number; // 1–4
  onChange: (level: number) => void;
}) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-700 text-xs">
      {EFFORT_LABELS.map((label, i) => (
        <button
          key={label}
          onClick={() => onChange(i + 1)}
          aria-pressed={value === i + 1}
          className={`flex-1 py-2.5 uppercase tracking-wide transition-colors ${
            value === i + 1
              ? "bg-sky-600 font-semibold text-white"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
