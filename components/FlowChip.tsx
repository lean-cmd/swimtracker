"use client";

import { FLOW_WARNING_M3S, SWIM_LANE_FACTOR, describeCurrent } from "@/lib/hydro";
import type { FlowInfo } from "@/lib/useRhineFlow";

/** Compact read-only flow display for views without the big map (GPX mode). */
export default function FlowChip({ flow }: { flow: FlowInfo }) {
  const kmh = flow.currentMs * SWIM_LANE_FACTOR * 3.6;
  const sourceDot = flow.status === "live" ? "●" : "◐";
  return (
    <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-sky-900/40 to-teal-900/30 px-4 py-2.5">
      {flow.q === null ? (
        <span className="text-sm text-slate-400">🌊 …</span>
      ) : (
        <div className="flex items-baseline gap-2 text-base text-slate-100">
          <span>
            🌊 <strong>{describeCurrent(kmh / 3.6)}</strong> ·{" "}
            <strong>{kmh.toFixed(1)} km/h</strong>
          </span>
          <span
            className="ml-auto text-xs text-slate-400"
            title={`${Math.round(flow.q)} m³/s (${flow.status})`}
          >
            {sourceDot} {Math.round(flow.q)} m³/s
          </span>
        </div>
      )}
      {flow.q !== null && flow.q > FLOW_WARNING_M3S && (
        <p className="mt-2 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm text-red-300">
          ⚠️ &gt;1&apos;500 m³/s — no swimming
        </p>
      )}
    </div>
  );
}
