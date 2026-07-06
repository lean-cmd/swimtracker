"use client";

/* eslint-disable @next/next/no-img-element */

import { BASEL_SPOTS, spotIndex } from "@/lib/rivers";

/**
 * The official canton zone map (recommended area / danger zone / harbour)
 * with entry & exit pins overlaid. Pin positions are hand-placed percent
 * coordinates on the 900×600 image.
 */
const PIN_POS: Record<string, { x: number; y: number }> = {
  dreirosen: { x: 20.5, y: 43.5 },
  johanniterbruecke: { x: 23.0, y: 63.0 },
  kaserne: { x: 27.8, y: 73.5 },
  "mittlere-bruecke": { x: 33.3, y: 79.5 },
  wettsteinbruecke: { x: 46.5, y: 83.5 },
  tinguely: { x: 59.0, y: 77.0 },
  schwarzwaldbruecke: { x: 71.0, y: 63.5 },
  breite: { x: 77.0, y: 58.0 },
  birskopf: { x: 89.0, y: 49.0 },
};

function Pin({
  spotId,
  kind,
}: {
  spotId: string;
  kind: "entry" | "exit";
}) {
  const pos = PIN_POS[spotId];
  if (!pos) return null;
  const spot = BASEL_SPOTS[spotIndex(spotId)];
  const color = kind === "entry" ? "bg-green-500" : "bg-red-500";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      aria-label={`${spot?.name ?? spotId} (${kind})`}
    >
      <span className="relative flex h-5 w-5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`}
        />
        <span
          className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-white ${color} text-[10px] font-bold text-white shadow-lg`}
        >
          {kind === "entry" ? "▶" : "■"}
        </span>
      </span>
    </div>
  );
}

export default function RhineMap({
  entryId,
  exitId,
}: {
  entryId: string | null;
  exitId: string | null;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700 shadow-lg">
      <img
        src="/basel-rhine-zones.jpg"
        alt="Official Basel Rhine swimming zone map: teal recommended area, red danger zone, striped harbour (prohibited)"
        className="block h-auto w-full"
      />
      {entryId && <Pin spotId={entryId} kind="entry" />}
      {exitId && <Pin spotId={exitId} kind="exit" />}
    </div>
  );
}
