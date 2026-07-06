# 🌊 Rhyschwumm

*Baseldytsch for a swim in the Rhy.* Estimates how much of a Basel Rhine
swim came from the current versus actual swimming effort — formerly
"CurrentCorrector".

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

Looking for the technical deep-dive (model formulas, hydrology pipeline,
code map)? See [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md).

Don't have a GPX file handy? Click **"Load the sample Basel Rhine swim"** on
the upload screen — a realistic 2.3 km / 20 min evening swim from
Schwarzwaldbrücke to Johanniterbrücke ships in
[`public/samples/basel-rhine-evening-swim.gpx`](public/samples/basel-rhine-evening-swim.gpx).

## What it does

**Log a Schwumm (default, one screen, no buttons)** — built for the reality
that trackers struggle in the Rhine (GPS drops underwater, optical HR fails
in water). Everything fits above the fold on a phone and results update
live as you pick:

- Two dropdowns (got in at / got out at) over the **official canton zone
  map** with animated entry/exit pins — Birskopf, Rheinbad Breite,
  Schwarzwaldbrücke, Museum Tinguely/Solitude (where the guided Tuesday
  swims start), Wettsteinbrücke, Mittlere Brücke, Kaserne,
  Johanniterbrücke, Dreirosenbrücke (the last legal exit before the
  harbour).
- Minutes in the water plus an effort dropdown (**I swam / I floated**).
  A float attributes the whole distance to the river — your drift speed
  *is* the current.
- No position question: a fixed usual-swim-lane factor (×0.85) applies,
  since ~15 m closer to shore or middle only shifts the current ~±15%.
- Results share via **WhatsApp** (wa.me link) or copy-paste for Strava.

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

- The user never has to enter a flow rate. On load the app resolves it
  automatically, in order: **(1)** live discharge from the Basel open data
  portal, dataset
  [100089 — "Rhein Wasserstand, Pegel und Abfluss"](https://data.bs.ch/explore/dataset/100089/)
  (~5-minute values from BAFU station 2289, Rhein–Basel/Rheinhalle), fetched
  straight from the browser; **(2)** the last successful reading cached in
  this browser, if less than 7 days old; **(3)** the long-term monthly
  average for the current month (climatology table in `lib/hydro.ts`). The
  status line always says which source is in use. A manual m³/s override
  lives under "Advanced".
- Discharge maps to an estimated **midstream surface velocity** via an
  empirical lookup (see `lib/hydro.ts`): <500 m³/s → ~0.8 m/s, 500–700 →
  1.0–1.2, 700–900 → 1.2–1.4, 900–1100 → 1.4–1.6, 1100–1400 → 1.6–1.9,
  above 1400 extrapolated with a low-confidence flag.
- Then "Where did you mostly swim?" scales it: close to Kleinbasel bank
  ×0.65 (inside of the bend), close to Grossbasel bank ×0.75, normal
  swimmer corridor ×0.85, middle of the river ×1.0.
- Above 1'500 m³/s the app shows the canton's official warning — that's the
  bs.ch guidance threshold for swimming at all.
- Results carry an explicit **"experimental estimate"** badge — this is a
  model, not scientific truth.

**Official zones ARE the map** — the app renders the canton's own zone map
image (`public/basel-rhine-zones.jpg`): teal recommended swimming area,
red danger zone toward the Birsfelden lock, striped prohibited harbour.
Birskopf and Rheinbad Breite are still selectable (people do start there)
but trigger a caution note as outside the recommended area.

**Output dashboard** — leads with one plain-language sentence ("You swam
456 m with your own power — the river carried you the other 1.4 km…"),
then the numbers: distance, time, average speed, river's share vs your
share, speed through water, pool-equivalent pace, current-boost %, and an
**energy estimate in kcal** — plus a copy-paste summary for your Strava
activity description.

Calories are MET-based (`lib/energy.ts`): the MET is picked from your speed
*through the water* (drifting with the current is not exercise, whatever
the GPS pace claims), times your weight (single input, default 75 kg) and
time. Note that a Strava GPX export contains GPS points, timestamps and
sometimes heart rate — but never calories, which is why the app estimates
them itself.

**Senior-friendly by design** — large type, plain words, no jargon on the
main screen. The only technical controls left (manual flow m³/s, midstream
m/s) hide behind a tiny "adjust" link.

## The current model (and its limits)

The MVP model is deliberately simple — averages plus vector algebra:

```
speed over ground = swimmer speed through water + current speed along route
```

- The midstream current comes from today's discharge via the lookup table
  above (falling back to 1.1 m/s ≈ typical summer flow), scaled by your
  position in the channel; it stays adjustable in m/s or km/h under
  "Advanced".
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
| Empirical Q→velocity lookup table | [`lib/hydro.ts`](lib/hydro.ts) | Calibrate against cross-section/ADCP data or repeated swims of known routes; cross-check the [BAFU station 2289](https://www.hydrodaten.admin.ch/en/2289.html) measurements. |
| Cross-channel factors (Kleinbasel ×0.65 / Grossbasel ×0.75 / corridor ×0.85 / middle ×1.0) | [`lib/hydro.ts`](lib/hydro.ts) | Real velocity profiles; infer position from GPS distance to the riverbank. |
| Straight-line flow direction | [`lib/gpx.ts`](lib/gpx.ts) | Follow the river centerline (OpenStreetMap `waterway` geometry) and project the current along the local flow direction at every point. |
| Whole-swim averaging, no GPX smoothing | [`lib/current.ts`](lib/current.ts) | Smooth the track, then apply the same formula segment-by-segment to expose intervals (sprint vs. drift phases). |
| Straight-hop spot distances, approximate spot coordinates | [`lib/rivers.ts`](lib/rivers.ts) | Measure along the actual river centerline between the marked entry/exit stairs. |
| Defensive field-name guessing on dataset 100089 | [`lib/hydro.ts`](lib/hydro.ts) | Pin the exact field once verified against the live API (this sandbox couldn't reach data.bs.ch). |
| No forecast | — | Dataset [100271 "Vorhersagen Rhein"](https://data.bs.ch/explore/dataset/100271/) for a "should I swim today?" view. |

### Official Basel rules baked into the UI

From the canton's Rhine page
(<https://www.bs.ch/themen/kultur-sport-und-freizeit/parks-und-rhein/rhein>):

- Swim only when discharge is **below 1'500 m³/s** (level < 6.50 m) — the
  app warns above that.
- Swim only at water temperature above 18 °C and good water quality.
- **No swimming in harbour areas** or around the Birsfelden lock — hence
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
  LogSwim.tsx           # entry/exit dropdowns + minutes + effort, live update
  RhineMap.tsx          # official canton zone map with entry/exit pins
  BaselMap.tsx          # (legacy) schematic SVG map, kept for reference
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
