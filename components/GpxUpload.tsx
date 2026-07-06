"use client";

import { useRef, useState } from "react";
import { GpxParseError, parseGpx } from "@/lib/gpx";
import type { ParsedTrack } from "@/lib/types";

export default function GpxUpload({
  onTrack,
}: {
  onTrack: (track: ParsedTrack, fileName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const track = parseGpx(await file.text());
      onTrack(track, file.name);
    } catch (e) {
      setError(
        e instanceof GpxParseError
          ? e.message
          : "Could not read this file. Is it a GPX export?"
      );
    }
  };

  const loadSample = async () => {
    setError(null);
    const res = await fetch("/samples/basel-rhine-evening-swim.gpx");
    const track = parseGpx(await res.text());
    onTrack(track, "basel-rhine-evening-swim.gpx (sample)");
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-sky-400 bg-sky-500/10"
            : "border-slate-600 bg-slate-800/40 hover:border-slate-400"
        }`}
      >
        <p className="text-slate-200">
          Drop a <span className="font-mono">.gpx</span> file here or tap to
          choose
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Exports from Strava, Garmin Connect or Apple Watch (via export apps)
          all work
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <button
        onClick={() => void loadSample()}
        className="text-sm text-sky-400 underline-offset-2 hover:underline"
      >
        No file handy? Load the sample Basel Rhine swim →
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
