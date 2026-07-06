# Rhyschwumm — Technical Documentation

How the app works under the hood: the current-correction model, the live
hydrology pipeline, the Basel spot/zone data, and where each piece lives in
the code. For a user-facing overview and quick start, see the
[README](../README.md).

- [What the app computes](#what-the-app-computes)
- [The current-correction model](#the-current-correction-model)
- [Where the current speed comes from](#where-the-current-speed-comes-from)
- [The two input modes](#the-two-input-modes)
- [Calorie estimate](#calorie-estimate)
- [Basel spots and official zones](#basel-spots-and-official-zones)
- [Code map](#code-map)
- [Data sources](#data-sources)
- [Known simplifications](#known-simplifications)

## What the app computes

A GPS watch in the Basel Rhine records speed **over ground** — swimmer
effort plus river current. Rhyschwumm splits that recorded swim into:

| Output | Meaning |
| --- | --- |
| River's share | Distance the current carried you (m) |
| Your share | Distance covered by your own swimming (m) |
| Speed through water | Your speed relative to the water (m/s) |
| Pool-equivalent pace | Still-water pace per 100 m you could compare with a pool session |
| Current boost | Percentage of the recorded distance attributable to the river |
| Calories | MET-based estimate from speed *through the water* |

Everything runs client-side: no backend, no database, no accounts. The only
persistent state is a `localStorage` cache of the last live flow reading.

## The current-correction model

Implemented in [`lib/current.ts`](../lib/current.ts) as plain algebra on
whole-swim averages:

```
gpsSpeed          = distance / elapsedTime
effectiveCurrent  = midstreamCurrent × positionFactor × routeAlignment
swimmerSpeed      = max(0, gpsSpeed − effectiveCurrent)

currentDistance   = min(distance, effectiveCurrent × elapsedTime)
swimmerDistance   = distance − currentDistance
poolPace          = 100 / swimmerSpeed        (sec per 100 m)
currentBoost      = currentDistance / distance × 100
```

Two special cases:

- **Floating detection** — if `swimmerSpeed` drops below 0.05 m/s (~3 m per
  minute), the swim is flagged as drifting. The pool-equivalent pace is
  suppressed (there is no meaningful still-water pace) and the app instead
  reports the current speed your track implies (`impliedCurrent =
  gpsSpeed`). In "Log a Schwumm" mode, choosing **"I floated"** forces this
  path deliberately.
- **Route alignment** — for GPX tracks, the current only helps for the part
  of the path aligned with the flow. [`lib/gpx.ts`](../lib/gpx.ts) computes
  a distance-weighted cosine between each track segment and the straight
  line from first to last point; a meandering track therefore gets less
  current credit. Manual entry/exit logging uses alignment = 1 (the spot
  chain follows the river).

## Where the current speed comes from

The user never types a flow rate. On load,
[`CurrentControls`](../components/CurrentControls.tsx) resolves today's
discharge through a fallback chain (all in
[`lib/hydro.ts`](../lib/hydro.ts)):

1. **Live** — fetch the latest ~5-minute reading from the Basel open data
   portal, dataset [100089 "Rhein Wasserstand, Pegel und Abfluss"](https://data.bs.ch/explore/dataset/100089/)
   (BAFU station 2289, Rhein–Basel/Rheinhalle). The portal allows CORS, so
   the fetch runs directly in the swimmer's browser. Parsing is defensive:
   it looks for a discharge-like field name (`abfluss`/`durchfluss`/`flow`)
   first, then falls back to any numeric value in the plausible 300–6000
   m³/s range.
2. **Cached** — the last successful live reading stored in `localStorage`,
   if less than 7 days old.
3. **Seasonal** — a long-term monthly climatology table (January ≈ 1050
   m³/s, June peak ≈ 1450, October low ≈ 950).

The status line always names the source in use, and a manual m³/s override
lives under "Advanced".

Discharge then maps to an estimated **midstream surface velocity** through
a piecewise-linear empirical lookup:

| Discharge (m³/s) | Midstream velocity (m/s) |
| --- | --- |
| ≤ 450 | 0.8 |
| 500 | 1.0 |
| 700 | 1.2 |
| 900 | 1.4 |
| 1100 | 1.6 |
| 1400 | 1.9 |
| > 1400 | extrapolated on the last segment's slope, capped at 3.0, flagged low-confidence |

Above **1'500 m³/s** the app shows the canton's official warning — that is
the bs.ch guidance threshold for swimming at all.

Finally the midstream value is scaled to where the swimmer actually is in
the channel. "Log a Schwumm" mode applies a fixed **swim-lane factor of
×0.85** without asking (staying ~15 m closer to shore or middle only shifts
the current about ±15%, within the model's error bars). GPX mode exposes
the full position choice: Kleinbasel bank ×0.65 (inside of the city bend),
Grossbasel bank ×0.75, usual swim corridor ×0.85, middle ×1.0.

## The two input modes

**Log a Schwumm** (default) — built for the reality that trackers struggle
in the Rhine (GPS drops underwater, optical heart rate fails in water).
One screen, no submit button, results update live:

- Entry and exit dropdowns over the official canton zone map with animated
  pins ([`LogSwim.tsx`](../components/LogSwim.tsx),
  [`RhineMap.tsx`](../components/RhineMap.tsx)).
- Distance is the sum of straight-line hops along the ordered spot chain
  between entry and exit (`distanceBetweenSpots` in
  [`lib/rivers.ts`](../lib/rivers.ts)).
- Minutes in the water plus an effort choice: **I swam** runs the normal
  model, **I floated** attributes the whole distance to the river.
- Results share via WhatsApp (`wa.me` link) or copy-paste for Strava.

**GPX / Strava** — for swimmers with a working track:

- Drag & drop a GPX export from Strava, Garmin Connect, or Apple Watch.
  [`lib/gpx.ts`](../lib/gpx.ts) parses it with the browser's `DOMParser`
  (no GPX library needed): track points, timestamps, haversine distance,
  elapsed time, and the route-alignment factor. A dependency-free SVG
  preview renders in [`RouteMap.tsx`](../components/RouteMap.tsx).
- Or paste a Strava activity link
  ([`StravaLink.tsx`](../components/StravaLink.tsx)) — the app extracts the
  activity ID and offers a one-click `…/export_gpx` download, which works
  because the *swimmer's* browser is logged in to Strava. Real OAuth is
  future work.
- A bundled sample swim (2.3 km, ~20 min, Schwarzwaldbrücke →
  Johanniterbrücke) lives at
  [`public/samples/basel-rhine-evening-swim.gpx`](../public/samples/basel-rhine-evening-swim.gpx).

## Calorie estimate

[`lib/energy.ts`](../lib/energy.ts): `kcal = MET × weight (kg) × hours`,
with the MET picked from the speed **through the water** — drifting with
the current is not exercise, whatever the GPS pace claims. MET anchors
follow the Compendium of Physical Activities:

| Speed through water (m/s) | MET | Reads as |
| --- | --- | --- |
| < 0.1 | 2.5 | floating / gentle treading |
| 0.1–0.4 | 4.5 | easy breaststroke |
| 0.4–0.7 | 6.0 | steady swimming |
| 0.7–1.0 | 8.3 | brisk freestyle |
| ≥ 1.0 | 9.8 | fast freestyle |

Weight is a single input, default 75 kg. No heart-rate use yet and no
cold-water thermogenesis — treat it as order-of-magnitude, the same way
watches do. (A Strava GPX contains GPS points, timestamps, sometimes HR —
never calories, which is why the app estimates them itself.)

## Basel spots and official zones

[`lib/rivers.ts`](../lib/rivers.ts) defines nine entry/exit spots ordered
upstream → downstream:

1. Birskopf ★ ⚠️
2. Rheinbad Breite (St. Alban) ★ ⚠️
3. Schwarzwaldbrücke — start of the recommended corridor
4. Museum Tinguely / Solitude ★ — the guided Tuesday swims start here
5. Wettsteinbrücke
6. Mittlere Brücke
7. Kaserne / Klingental
8. Johanniterbrücke
9. Dreirosenbrücke ★ — **the last legal exit** before the harbour

★ = popular classic, ⚠️ = outside the official recommended swimming area
(selectable, since people do start there, but flagged with a caution note).

The zone semantics mirror the canton's official map, which the UI renders
directly (`public/basel-rhine-zones.jpg` in
[`RhineMap.tsx`](../components/RhineMap.tsx)): teal recommended swimming
area Schwarzwaldbrücke → Dreirosenbrücke, red danger zone upstream toward
the Birsfelden lock, striped prohibited harbour downstream of
Dreirosenbrücke. A legacy dependency-free SVG schematic of the same data is
kept in [`BaselMap.tsx`](../components/BaselMap.tsx).

Official rules baked into the UI (from
[bs.ch → Parks und Rhein → Rhein](https://www.bs.ch/themen/kultur-sport-und-freizeit/parks-und-rhein/rhein)):
swim only below 1'500 m³/s, no swimming in harbour areas or near the
Birsfelden lock, exit at Dreirosenbrücke at the latest.

## Code map

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
  CurrentControls.tsx   # today's flow (live fetch → cache → seasonal) + position
  ResultsDashboard.tsx  # plain-language lead, stat cards, share/export
  RouteMap.tsx          # dependency-free SVG route preview of uploaded GPX
  StatCard.tsx
lib/
  current.ts            # the correction model — all the math lives here
  hydro.ts              # discharge→velocity mapping, live fetch, cache, climatology
  rivers.ts             # river presets + Basel entry/exit spots + spot distances
  gpx.ts                # GPX parsing (DOMParser) + route-alignment factor
  energy.ts             # MET-based calorie estimate
  geo.ts                # haversine + bearing helpers
  summary.ts            # Strava description text builder
  format.ts             # pace/duration/speed formatting
  types.ts              # SwimInput / CorrectionResult and friends
```

Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4. No runtime
dependencies beyond that — GPX parsing, maps, and charts are all
hand-rolled to keep the bundle small.

## Data sources

| Source | Used for | Access |
| --- | --- | --- |
| [data.bs.ch dataset 100089](https://data.bs.ch/explore/dataset/100089/) | Live discharge + level, ~5-min values (BAFU station 2289) | CORS fetch from the browser |
| [BAFU station 2289](https://www.hydrodaten.admin.ch/en/2289.html) | Reference for the gauge behind dataset 100089 | reference only |
| [data.bs.ch dataset 100271](https://data.bs.ch/explore/dataset/100271/) | Flow forecast ("should I swim today?") | planned, not yet used |
| [bs.ch Rhine page](https://www.bs.ch/themen/kultur-sport-und-freizeit/parks-und-rhein/rhein) | Official zones, rules, 1'500 m³/s threshold, guided-swim info | baked into UI copy/data |

## Known simplifications

Every shortcut is marked with a `SIMPLIFICATION:` comment at its definition
site. The headline ones, with their upgrade paths:

| Simplification | Where | Real-data upgrade |
| --- | --- | --- |
| Single constant current for the whole swim | `lib/current.ts` | Segment-by-segment application of the same formula (exposes sprint vs. drift intervals) |
| Empirical Q→velocity lookup | `lib/hydro.ts` | Calibrate against cross-section/ADCP data or repeated swims of known routes |
| Cross-channel factors (×0.65/×0.75/×0.85/×1.0) | `lib/hydro.ts` | Measured velocity profiles; infer position from GPS distance to the bank |
| Straight-line flow direction | `lib/gpx.ts` | Follow the OSM river centerline and project the current locally |
| Straight-hop spot distances | `lib/rivers.ts` | Measure along the centerline between the marked exit stairs |
| Defensive field-name guessing on dataset 100089 | `lib/hydro.ts` | Pin exact field names once verified against the live API |
| Rounded monthly climatology | `lib/hydro.ts` | Compute real monthly means from dataset 100089 history |

Results carry an explicit **"experimental estimate"** badge in the UI —
this is a model, not scientific truth.
