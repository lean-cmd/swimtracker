import { bearingRad, haversineMeters } from "./geo";
import type { ParsedTrack, TrackPoint } from "./types";

export class GpxParseError extends Error {}

/**
 * Parse GPX text into a track using the browser's DOMParser.
 * Handles the standard Strava / Garmin / Apple Watch export shape:
 * <trk><trkseg><trkpt lat=".." lon=".."><time>ISO</time></trkpt>…
 *
 * Multiple <trkseg> elements are concatenated (watches split segments on
 * pauses); <rte>/<rtept> is accepted as a fallback for route-only files.
 */
export function parseGpx(xmlText: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new GpxParseError("This file is not valid XML/GPX.");
  }

  let pointNodes = Array.from(doc.getElementsByTagName("trkpt"));
  if (pointNodes.length === 0) {
    pointNodes = Array.from(doc.getElementsByTagName("rtept"));
  }
  if (pointNodes.length < 2) {
    throw new GpxParseError(
      "No GPS track found in this file (need at least 2 track points)."
    );
  }

  const points: TrackPoint[] = [];
  let missingTime = 0;
  for (const node of pointNodes) {
    const lat = parseFloat(node.getAttribute("lat") ?? "");
    const lon = parseFloat(node.getAttribute("lon") ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const timeText = node.getElementsByTagName("time")[0]?.textContent;
    const time = timeText ? Date.parse(timeText) : NaN;
    if (!Number.isFinite(time)) {
      missingTime++;
      continue;
    }
    points.push({ lat, lon, time });
  }

  if (points.length < 2) {
    throw new GpxParseError(
      missingTime > 0
        ? "This GPX file has no timestamps, so pace can't be computed. Use manual entry instead."
        : "Could not read coordinates from this GPX file."
    );
  }

  // Some exports are unordered or contain duplicate timestamps — sort and dedupe.
  points.sort((a, b) => a.time - b.time);

  let distanceMeters = 0;
  for (let i = 1; i < points.length; i++) {
    distanceMeters += haversineMeters(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
  }

  const elapsedSeconds = (points[points.length - 1].time - points[0].time) / 1000;
  if (elapsedSeconds <= 0 || distanceMeters <= 0) {
    throw new GpxParseError("Track has no elapsed time or distance.");
  }

  const name =
    doc.getElementsByTagName("name")[0]?.textContent?.trim() || null;

  return {
    name,
    points,
    distanceMeters,
    elapsedSeconds,
    startTime: points[0].time,
    routeAlignment: computeRouteAlignment(points),
  };
}

/**
 * Distance-weighted mean of cos(angle between each segment and the overall
 * start→end bearing), clamped to [0, 1].
 *
 * SIMPLIFICATION: the MVP current model assumes the river flows along the
 * straight line from the first to the last GPS point. This alignment factor
 * projects that current vector onto the actual swim path, so a meandering
 * track gets slightly less current credit than a straight one. A real
 * implementation would use a river centerline (e.g. from OpenStreetMap
 * waterway geometry) and project the current along the local flow direction
 * at every track point.
 */
function computeRouteAlignment(points: TrackPoint[]): number {
  const first = points[0];
  const last = points[points.length - 1];
  const overall = bearingRad(first.lat, first.lon, last.lat, last.lon);

  let weighted = 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineMeters(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
    if (d === 0) continue;
    const b = bearingRad(
      points[i - 1].lat,
      points[i - 1].lon,
      points[i].lat,
      points[i].lon
    );
    weighted += d * Math.cos(b - overall);
    total += d;
  }
  if (total === 0) return 1;
  return Math.min(1, Math.max(0, weighted / total));
}
