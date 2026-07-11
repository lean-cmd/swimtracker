"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLOW_WARNING_M3S,
  SWIM_LANE_FACTOR,
  describeCurrent,
  fetchLiveFlow,
  loadCachedFlow,
  midstreamCurrentFromDischarge,
  saveCachedFlow,
  seasonalDischarge,
} from "@/lib/hydro";

/**
 * Read-only status chip: today's Rhine current in plain words, resolved
 * automatically (live data.bs.ch → cached reading → seasonal average).
 * There are deliberately NO inputs — a normal swimmer should never type a
 * flow rate or a current speed. High-water gets a warning.
 */
type FlowState =
  | { status: "loading" }
  | { status: "live"; q: number }
  | { status: "cached"; q: number; fetchedAt: number }
  | { status: "seasonal"; q: number; month: string }
  | { status: "manual"; q: number };

export default function CurrentControls({
  currentMs,
  onCurrentChange,
}: {
  /** Midstream current; SWIM_LANE_FACTOR is applied for display & model. */
  currentMs: number;
  onCurrentChange: (ms: number) => void;
}) {
  const [flow, setFlow] = useState<FlowState>({ status: "loading" });
  const resolvedOnce = useRef(false);

  const applyDischarge = useCallback(
    (q: number) => onCurrentChange(midstreamCurrentFromDischarge(q)),
    [onCurrentChange]
  );

  useEffect(() => {
    if (resolvedOnce.current) return;
    resolvedOnce.current = true;
    fetchLiveFlow()
      .then((live) => {
        saveCachedFlow(live);
        setFlow({ status: "live", q: live.dischargeM3s });
        applyDischarge(live.dischargeM3s);
      })
      .catch(() => {
        const cached = loadCachedFlow();
        if (cached) {
          setFlow({
            status: "cached",
            q: cached.dischargeM3s,
            fetchedAt: cached.fetchedAt,
          });
          applyDischarge(cached.dischargeM3s);
        } else {
          const now = new Date();
          const q = seasonalDischarge(now);
          setFlow({
            status: "seasonal",
            q,
            month: now.toLocaleString("en", { month: "long" }),
          });
          applyDischarge(q);
        }
      });
  }, [applyDischarge]);

  const q =
    flow.status === "loading"
      ? null
      : (flow as Exclude<FlowState, { status: "loading" }>).q;
  const atYourLine = currentMs * SWIM_LANE_FACTOR;

  // ● live, ◐ cached/seasonal — one glyph instead of a sentence.
  const sourceDot = flow.status === "live" ? "●" : "◐";

  return (
    <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-sky-900/40 to-teal-900/30 px-4 py-2.5">
      {q === null ? (
        <span className="text-sm text-slate-400">🌊 …</span>
      ) : (
        <div className="flex items-baseline gap-2 text-base text-slate-100">
          <span>
            🌊 <strong>{describeCurrent(atYourLine)}</strong> ·{" "}
            <strong>{(atYourLine * 3.6).toFixed(1)} km/h</strong>
          </span>
          <span
            className="ml-auto text-xs text-slate-400"
            title={`${Math.round(q)} m³/s (${flow.status})`}
          >
            {sourceDot} {Math.round(q)} m³/s
          </span>
        </div>
      )}

      {q !== null && q > FLOW_WARNING_M3S && (
        <p className="mt-2 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm text-red-300">
          ⚠️ &gt;1&apos;500 m³/s — no swimming
        </p>
      )}
    </div>
  );
}
