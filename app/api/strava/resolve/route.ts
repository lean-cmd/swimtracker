import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve any Strava link — especially strava.app.link short links, which
 * the browser cannot follow itself (no CORS) — to the numeric activity ID.
 * Short links are Branch.io redirects; the ID appears either in a Location
 * header hop or embedded in the interstitial HTML.
 *
 * Downloading the GPX still has to happen in the swimmer's own browser
 * (their strava.com session authorizes /export_gpx); this route only makes
 * the link resolution automatic.
 */
const ALLOWED = /^https:\/\/(strava\.app\.link|(www\.)?strava\.com)\//;
const ID_RE = /strava\.com\/activities\/(\d+)/;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  const url = raw.startsWith("http") ? raw : `https://${raw}`;
  if (!ALLOWED.test(url)) {
    return NextResponse.json({ error: "Not a Strava link" }, { status: 400 });
  }

  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const direct = current.match(ID_RE);
    if (direct) return NextResponse.json({ activityId: direct[1] });

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": "Mozilla/5.0 (compatible; Rhyschwumm/1.0)" },
      });
    } catch {
      return NextResponse.json(
        { error: "Could not reach Strava" },
        { status: 502 }
      );
    }

    const loc = res.headers.get("location");
    if (loc) {
      current = new URL(loc, current).toString();
      continue;
    }

    // No more redirects — look for the activity URL inside the page
    // (Branch interstitials embed $canonical_url / og:url).
    const html = await res.text();
    const embedded = html.match(ID_RE);
    if (embedded) return NextResponse.json({ activityId: embedded[1] });
    break;
  }

  return NextResponse.json(
    { error: "No activity found behind this link" },
    { status: 404 }
  );
}
