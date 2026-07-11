"use client";

import { useRef, useState } from "react";
import { GpxParseError, parseGpx } from "@/lib/gpx";
import type { ParsedTrack } from "@/lib/types";

/**
 * One import flow behind the menu button: paste ANY Strava link (short
 * app-links get resolved server-side) → we open the GPX export with the
 * swimmer's own Strava session → they pick/drop the downloaded file and
 * the track lands in the app. Plain .gpx files work directly.
 */
type Stage = "idle" | "resolving" | "awaiting-file";

export default function ImportSheet({
  onTrack,
  onClose,
}: {
  onTrack: (track: ParsedTrack, fileName: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const track = parseGpx(await file.text());
      onTrack(track, file.name);
      onClose();
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
    onTrack(track, "sample swim");
    onClose();
  };

  const fetchFromStrava = async () => {
    setError(null);
    const direct = link.match(/strava\.com\/activities\/(\d+)/)?.[1];
    let id = direct ?? null;
    if (!id) {
      setStage("resolving");
      try {
        const res = await fetch(
          `/api/strava/resolve?url=${encodeURIComponent(link)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not resolve link");
        id = data.activityId as string;
      } catch (e) {
        setStage("idle");
        setError(e instanceof Error ? e.message : "Could not resolve link");
        return;
      }
    }
    // The swimmer's own browser session authorizes the download.
    window.open(
      `https://www.strava.com/activities/${id}/export_gpx`,
      "_blank",
      "noopener"
    );
    setStage("awaiting-file");
  };

  const canFetch = /strava\.(app\.link|com)\//.test(link);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/70 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-3 rounded-t-3xl border border-slate-700 bg-slate-900 p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">
            Import from Strava or file
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Strava link — short app-links welcome */}
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="Paste Strava link (short link ok)"
            value={link}
            onChange={(e) => {
              setLink(e.target.value.trim());
              setStage("idle");
            }}
            className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500"
          />
          <button
            disabled={!canFetch || stage === "resolving"}
            onClick={() => void fetchFromStrava()}
            className="shrink-0 rounded-xl bg-orange-600 px-4 py-2.5 text-base font-medium text-white disabled:opacity-40"
          >
            {stage === "resolving" ? "…" : "Get GPX"}
          </button>
        </div>

        {stage === "awaiting-file" && (
          <p className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
            Strava is downloading your GPX (log in there if asked). Then pick
            the file below — done.
          </p>
        )}

        {/* file drop / picker */}
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
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? "border-sky-400 bg-sky-500/10"
              : stage === "awaiting-file"
                ? "border-orange-400/70 bg-orange-500/5"
                : "border-slate-600 bg-slate-800/40 hover:border-slate-400"
          }`}
        >
          <p className="text-base text-slate-200">
            📄 Choose / drop <span className="font-mono">.gpx</span>
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

        <div className="flex items-center justify-between">
          <button
            onClick={() => void loadSample()}
            className="text-sm text-sky-400 underline-offset-2 hover:underline"
          >
            Try the sample →
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
