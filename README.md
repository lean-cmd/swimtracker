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

**Log a swim (default, Basel-first)** — built for the reality that trackers
struggle in the Rhine (GPS drops underwater, optical HR fails in water):

- Tap entry and exit spots on a schematic Basel map — Birskopf, Rheinbad
  Breite, Schwarzwaldbrücke, Museum Tinguely/Solitude (where the guided
  Tuesday swims start), Wettsteinbrücke, Mittlere Brücke, Kaserne,
  Johanniterbrücke, Dreirosenbrücke (the last legal exit before the harbor).
  ★ marks the classics.
- Enter your time in the water and whether you **swam** or **floated**.
- Floating is treated as a free current measurement: your drift speed *is*
  the current speed at your line in the river, and the app calibrates the
  current setting from it.

**GPX / Strava mode** — for swimmers with a working track:

- Drop in a GPX export from Strava, Garmin Connect, or Apple Watch: parses
  points + timestamps, GPS distance, elapsed time, pace, and renders an SVG
  route preview.
- Or paste a Strava activity link — the app extracts the activity ID and
  gives you a one-click `…/export_gpx` download (works because *your*
  browser is logged in to Strava; a real OAuth integration is future work).

**Today's flow, not a constant** — the Rhine's discharge changes every day
(e.g. ~613 m³/s on a dry July day vs ~1,050 m³/s annual mean), and the
current also depends on where you swim in the channel:

- Type today's flow (m³/s) from the BachApp, or hit **Fetch live** to pull
  the latest value from the Basel open data portal
  ([dataset 100246](https://data.bs.ch/explore/assets/100246/)) straight
  from your browser.
- Current speed is derived from flow via a rough cross-section estimate
  (see `lib/hydro.ts`), then scaled by your line in the river:
  close to shore ×0.7, typical swim line ×1.0, mid-river ×1.15.
- Above 1'500 m³/s the app shows the canton's official warning — that's the
  bs.ch guidance threshold for swimming at all.

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
| Flow → speed via fixed cross-section (v ≈ 1.3·Q/1000 m²) | [`lib/hydro.ts`](lib/hydro.ts) | Calibrate a stage–velocity rating curve against the [BAFU station 2289](https://www.hydrodaten.admin.ch/en/2289.html) (Rhein–Basel, Rheinhalle) measurements. |
| Cross-channel factors (shore ×0.7 / typical ×1.0 / middle ×1.15) | [`lib/hydro.ts`](lib/hydro.ts) | Real velocity profiles from bathymetry or ADCP measurements. |
| Straight-line flow direction | [`lib/gpx.ts`](lib/gpx.ts) | Follow the river centerline (OpenStreetMap `waterway` geometry) and project the current along the local flow direction at every point. |
| Whole-swim averaging | [`lib/current.ts`](lib/current.ts) | Apply the same formula segment-by-segment to expose intervals (sprint vs. drift phases). |
| Straight-hop spot distances, approximate spot coordinates | [`lib/rivers.ts`](lib/rivers.ts) | Measure along the actual river centerline between the marked entry/exit stairs. |
| Defensive field-name guessing on dataset 100246 | [`lib/hydro.ts`](lib/hydro.ts) | Pin the exact field once verified against the live API (this sandbox couldn't reach data.bs.ch). |

### Official Basel rules baked into the UI

From the canton's Rhine page
(<https://www.bs.ch/themen/kultur-sport-und-freizeit/parks-und-rhein/rhein>):

- Swim only when discharge is **below 1'500 m³/s** (level < 6.50 m) — the
  app warns above that.
- Swim only at water temperature above 18 °C and good water quality.
- **No swimming in harbor areas** or around the Birsfelden lock — hence
  Dreirosenbrücke is the last exit in the spot list.
- No jumping from bridges; no air mattresses/floating toys; swim bag
  (Wickelfisch) recommended for visibility but not tied to your body.
- Guided swims: Tuesdays (July–mid-September), 17:45 below Museum Tinguely,
  swimming to Wettsteinbrücke — that entry spot is a ★ classic in the app.
- The canton's **BachApp** shows daily flow, temperature, and water quality.

## Project structure

```
app/
  page.tsx              # main screen: input mode tabs, controls, dashboard
  layout.tsx            # metadata + dark theme shell
components/
  LogSwim.tsx           # self-reported: entry/exit spots + time + swim/float
  BaselMap.tsx          # tappable schematic Basel Rhine map (SVG)
  GpxUpload.tsx         # drag & drop / file picker / sample loader
  StravaLink.tsx        # paste a Strava activity link → GPX export button
  CurrentControls.tsx   # preset + today's flow (live fetch) + swim position
  ResultsDashboard.tsx  # stat cards, river-vs-you bar, Strava summary export
  RouteMap.tsx          # dependency-free SVG route preview of uploaded GPX
  StatCard.tsx
lib/
  gpx.ts                # GPX parsing (DOMParser) + route alignment factor
  current.ts            # the correction model — all the math lives here
  hydro.ts              # flow→current mapping + live data.bs.ch fetch
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
