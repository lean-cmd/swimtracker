"use client";

import { useEffect, useState } from "react";
import type { Sex } from "@/lib/energy";

export interface Profile {
  weightKg: number;
  sex: Sex;
}

const KEY = "rhyschwumm.profile";

export function loadProfile(fallbackWeight: number): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Profile;
      if (typeof p.weightKg === "number" && p.weightKg > 0) return p;
    }
  } catch {
    // storage unavailable — defaults are fine
  }
  return { weightKg: fallbackWeight, sex: "u" };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — session-only then
  }
}

/**
 * ⚙️ button + dropdown panel for the two personal inputs the calorie
 * estimate uses. Deliberately the ONLY place personal data is asked for,
 * with a plain sentence explaining why.
 */
export default function ProfileSettings({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile settings"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-base hover:bg-slate-700"
      >
        ⚙️
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
          <label className="flex items-center justify-between gap-2 text-base text-slate-200">
            Weight
            <span className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="30"
                max="200"
                value={profile.weightKg}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v > 0)
                    onChange({ ...profile, weightKg: v });
                }}
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 p-2 text-base text-slate-100"
                aria-label="Your weight in kilograms"
              />
              <span className="text-sm text-slate-400">kg</span>
            </span>
          </label>
          <div className="mt-3 flex items-center justify-between gap-2 text-base text-slate-200">
            Body
            <div className="flex overflow-hidden rounded-lg border border-slate-600 text-sm">
              {(
                [
                  ["f", "F"],
                  ["m", "M"],
                  ["u", "–"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => onChange({ ...profile, sex: value })}
                  aria-pressed={profile.sex === value}
                  className={`px-3.5 py-2 ${
                    profile.sex === value
                      ? "bg-sky-600 font-semibold text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            Used only to estimate calories more accurately — burn scales with
            body weight, and body composition shifts it a little. Stored on
            your device.
          </p>
        </div>
      )}
    </div>
  );
}
