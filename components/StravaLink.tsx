"use client";

import { useState } from "react";

/**
 * Turn a pasted Strava activity link into a one-click GPX download.
 *
 * Strava has no public unauthenticated API, but the swimmer's own browser is
 * logged in to strava.com — so linking straight to the activity's
 * /export_gpx endpoint downloads the file for them, and they drop it into
 * the upload box. (A full OAuth integration is the real fix later.)
 */
export default function StravaLink() {
  const [link, setLink] = useState("");

  const activityId = link.match(/strava\.com\/activities\/(\d+)/)?.[1] ?? null;
  const isShortLink = /strava\.app\.link\//.test(link);

  return (
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <label className="block text-sm text-slate-300">
        …or paste a Strava activity link
        <input
          type="url"
          placeholder="https://www.strava.com/activities/1234567890"
          value={link}
          onChange={(e) => setLink(e.target.value.trim())}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 p-2.5 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </label>

      {activityId && (
        <a
          href={`https://www.strava.com/activities/${activityId}/export_gpx`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Download GPX from Strava →
        </a>
      )}
      {activityId && (
        <p className="text-xs text-slate-400">
          Opens Strava in a new tab (you need to be logged in there). Then drop
          the downloaded file into the box above.
        </p>
      )}
      {isShortLink && (
        <p className="text-xs text-amber-300">
          That&apos;s a Strava share short-link, which hides the activity ID.
          Open it, then copy the full{" "}
          <span className="font-mono">strava.com/activities/…</span> URL from
          the browser — or use the activity&apos;s ⋯ menu → “Export GPX” in the
          Strava app.
        </p>
      )}
    </div>
  );
}
