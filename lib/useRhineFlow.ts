"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchLiveFlow,
  loadCachedFlow,
  midstreamCurrentFromDischarge,
  saveCachedFlow,
  seasonalDischarge,
} from "./hydro";

/**
 * Resolves today's Rhine flow once per mount: live data.bs.ch → cached
 * reading → seasonal average. The UI never asks the user for river data.
 */
export interface FlowInfo {
  status: "loading" | "live" | "cached" | "seasonal";
  /** Discharge in m³/s, null while loading. */
  q: number | null;
  /** Midstream surface current in m/s (lane factor NOT applied). */
  currentMs: number;
}

const LOADING_DEFAULT_MS = 1.1; // typical summer value, replaced on resolve

export function useRhineFlow(): FlowInfo {
  const [info, setInfo] = useState<FlowInfo>({
    status: "loading",
    q: null,
    currentMs: LOADING_DEFAULT_MS,
  });
  const resolvedOnce = useRef(false);

  useEffect(() => {
    if (resolvedOnce.current) return;
    resolvedOnce.current = true;
    const apply = (status: FlowInfo["status"], q: number) =>
      setInfo({ status, q, currentMs: midstreamCurrentFromDischarge(q) });
    fetchLiveFlow()
      .then((live) => {
        saveCachedFlow(live);
        apply("live", live.dischargeM3s);
      })
      .catch(() => {
        const cached = loadCachedFlow();
        if (cached) apply("cached", cached.dischargeM3s);
        else apply("seasonal", seasonalDischarge(new Date()));
      });
  }, []);

  return info;
}
