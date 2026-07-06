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
 * One compact line: today's current in plain words, resolved automatically
 * (live data.bs.ch → cached reading → seasonal average). A tiny "adjust"
 * disclosure hides the only expert controls left: flow m³/s and current m/s.
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
  const [flowText, setFlowText] = useState("");
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

  const sourceNote =
    flow.status === "live"
      ? "live"
      : flow.status === "cached"
        ? `reading from ${new Date((flow as { fetchedAt: number }).fetchedAt).toLocaleDateString()}`
        : flow.status === "seasonal"
          ? `typical for ${(flow as { month: string }).month}`
          : "set by hand";

  return (
    <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-sky-900/40 to-teal-900/30 px-4 py-3">
      {q === null ? (
        <span className="text-sm text-slate-400">Checking the Rhine… 🌊</span>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-2 text-base text-slate-100">
          <span>
            🌊 Current today: <strong>{describeCurrent(atYourLine)}</strong> —
            it carries you at ~
            <strong>{(atYourLine * 3.6).toFixed(1)} km/h</strong>
          </span>
          <span className="text-xs text-slate-400">
            ({Math.round(q)} m³/s, {sourceNote})
          </span>
        </div>
      )}

      {q !== null && q > FLOW_WARNING_M3S && (
        <p className="mt-2 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm text-red-300">
          ⚠️ Very high water — the canton advises <strong>not to swim</strong>{" "}
          above 1&apos;500 m³/s.
        </p>
      )}

      <p className="mt-1 text-xs text-slate-500">
        We assume the usual swim lane. ~15 m closer to shore or middle only
        changes this by about ±15%.
      </p>

      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
          adjust
        </summary>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <input
            type="number"
            min="0"
            placeholder="flow m³/s"
            value={flowText}
            onChange={(e) => setFlowText(e.target.value)}
            className="w-28 rounded-lg border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100"
            aria-label="Flow rate in cubic meters per second"
          />
          <button
            disabled={!(parseFloat(flowText) > 0)}
            onClick={() => {
              const v = parseFloat(flowText);
              setFlow({ status: "manual", q: v });
              applyDischarge(v);
            }}
            className="rounded-lg bg-sky-700 px-3 py-2 text-sm text-white hover:bg-sky-600 disabled:opacity-40"
          >
            Use m³/s
          </button>
          <label className="ml-2 inline-flex items-center gap-1">
            or current
            <input
              type="number"
              min="0"
              max="4"
              step="0.05"
              value={Number(currentMs.toFixed(2))}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v) && v >= 0) onCurrentChange(v);
              }}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800 p-2 text-sm text-slate-100"
              aria-label="Midstream current in meters per second"
            />
            m/s midstream
          </label>
        </div>
      </details>
    </div>
  );
}
