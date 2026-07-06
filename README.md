# 🌊 CurrentCorrector

Estimate how much of a river swim's recorded distance/pace came from the
current versus actual swimming effort.

Built for Basel Rhine swimmers whose watches log heroic paces like
**1:12 /100 m** — because the river did half the work. Upload a GPX track (or
log a swim by entry/exit point) and get an honest split: swimmer-powered
distance, speed through the water, and an effort-equivalent still-water pace
you could actually compare with a pool session.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database, no accounts — everything runs in
your browser with local state only.

Don't have a GPX file handy? Click **"Load the sample Basel Rhine swim"** on
the upload screen — a realistic 2.3 km / 20 min evening swim from
Schwarzwaldbrücke to Johanniterbrücke ships in
[`public/samples/basel-rhine-evening-swim.gpx`](public/samples/basel-rhine-evening-swim.gpx).

## What it does

**GPX mode** — drop in an export from Strava, Garmin Connect, or Apple Watch:

- Parses track points (lat/lon + timestamps), total GPS distance, elapsed
  time, average GPS speed/pace.
- Renders a dependency-free SVG preview of the route.
- Splits distance into *current-assisted* and *swimmer-powered* using the
  current model below.

**Manual mode (Basel)** — for swims the watch didn't track (GPS drops
underwater; wrist trackers famously struggle in the Rhine):

- Pick entry and exit spots (Schwarzwaldbrücke → … → Dreirosenbrücke),
  enter your time in the water, and whether you **swam** or **floated**.
- Floating is treated as a free current measurement: your drift speed *is*
  the current speed, and the app calibrates the current slider from it.

**Output dashboard** — GPS distance, elapsed time, average GPS speed,
current-assisted distance, swimmer-powered distance, speed through water,
effort-equivalent still-water pace, and a "current boost" percentage — plus a
copy-paste summary for your Strava activity description.

## The current model (and its limits)

The MVP model is deliberately simple — averages plus vector algebra:

```
speed over ground = swimmer speed through water + current speed along route
```

- Default current: **1.5 m/s** downstream for the Basel Rhine preset,
  adjustable in m/s or km/h.
- Current direction is assumed to follow the straight line between the first
  and last GPS points. A *route alignment* factor (distance-weighted cosine
  between each track segment and that line) projects the current onto the
  actual path, so meandering tracks get less current credit.
- If the configured current fully explains your GPS speed, the app flags the
  swim as **floating/drifting** and shows the current speed your track
  implies.

### Where real hydrological data could plug in

The simplifications are marked with `SIMPLIFICATION:` comments in the code:

| Simplification | Where | Real-data upgrade |
| --- | --- | --- |
| Constant current speed | [`lib/current.ts`](lib/current.ts), [`lib/rivers.ts`](lib/rivers.ts) | Fetch live discharge from the [BAFU hydrology service](https://www.hydrodaten.admin.ch/en/2289.html) (station 2289, Rhein–Basel, Rheinhalle) and map discharge → surface speed via a rating curve. The Basel Rhine swings roughly 1–2.5 m/s with discharge. |
| Straight-line flow direction | [`lib/gpx.ts`](lib/gpx.ts) | Follow the river centerline (OpenStreetMap `waterway` geometry) and project the current along the local flow direction at every point. |
| Whole-swim averaging | [`lib/current.ts`](lib/current.ts) | Apply the same formula segment-by-segment to expose intervals (sprint vs. drift phases). |
| Straight-hop spot distances | [`lib/rivers.ts`](lib/rivers.ts) | Measure along the actual river centerline between entry/exit stairs. |

Official context for the Basel stretch (swim section, entry/exit stairs,
safety rules): the canton's Rhine page —
<https://www.bs.ch/themen/kultur-sport-und-freizeit/parks-und-rhein/rhein>.
Swimmers exit before the harbor at Dreirosenbrücke; the presets reflect that.

## Project structure

```
app/
  page.tsx              # main screen: input mode tabs, controls, dashboard
  layout.tsx            # metadata + dark theme shell
components/
  GpxUpload.tsx         # drag & drop / file picker / sample loader
  ManualEntry.tsx       # Basel entry/exit spots + time + swim/float effort
  CurrentControls.tsx   # river preset + current speed in m/s, km/h, slider
  ResultsDashboard.tsx  # stat cards, river-vs-you bar, Strava summary export
  RouteMap.tsx          # dependency-free SVG route preview
  StatCard.tsx
lib/
  gpx.ts                # GPX parsing (DOMParser) + route alignment factor
  current.ts            # the correction model — all the math lives here
  rivers.ts             # river presets + Basel entry/exit spots
  geo.ts                # haversine + bearing helpers
  summary.ts            # Strava description text builder
  format.ts             # pace/duration/speed formatting
public/samples/
  basel-rhine-evening-swim.gpx
```

## Tech

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- No GPX library — swim exports are simple enough that the browser's
  `DOMParser` covers Strava/Garmin/Apple Watch files without a dependency.
- Local state only; no database.

## Roadmap ideas

- Live current from BAFU discharge data (see table above)
- Real map tiles (MapLibre) instead of the SVG preview
- Per-segment effort timeline
- More rivers (Aare/Bern, Limmat/Zürich, Reuss/Luzern)
