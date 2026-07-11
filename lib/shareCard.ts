/**
 * Render the swim as a square PNG stat card and hand it to the native
 * share sheet (or download it). Solves two things at once: shareable
 * bragging material, and a picture that health apps (e.g. Google Health's
 * coach via Gallery/Files) can ingest, since none of them accept .tcx.
 */
export interface CardData {
  label: string;
  youMeters: number;
  rhyMeters: number;
  rhyPercent: number;
  kcal: number;
  durationText: string;
  paceText: string | null;
  raceText: string;
  kmh: number;
  tempC: number | null;
}

const fmtKm = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

export async function shareCard(data: CardData): Promise<void> {
  const S = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  // background
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(1, "#082f49");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // wavy accent
  ctx.strokeStyle = "rgba(56,189,248,0.25)";
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const y = 210 + i * 44;
    ctx.moveTo(-40, y);
    for (let x = 0; x <= S + 40; x += 90) {
      ctx.quadraticCurveTo(x + 22, y - 26, x + 45, y);
      ctx.quadraticCurveTo(x + 68, y + 26, x + 90, y);
    }
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.fillText("🌊 Rhyschwumm", S / 2, 120);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "44px system-ui, sans-serif";
  ctx.fillText(data.label, S / 2, 180, S - 120);

  // three big numbers
  const cols = [
    { v: fmtKm(data.youMeters), l: "🏊 you", c: "#6ee7b7" },
    { v: fmtKm(data.rhyMeters), l: "🌊 Rhy", c: "#7dd3fc" },
    { v: `${Math.round(data.kcal)}`, l: "🔥 kcal", c: "#fdba74" },
  ];
  cols.forEach((col, i) => {
    const x = S / 6 + (i * S) / 3;
    ctx.fillStyle = col.c;
    ctx.font = "bold 88px system-ui, sans-serif";
    ctx.fillText(col.v, x, 430);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "40px system-ui, sans-serif";
    ctx.fillText(col.l, x, 490);
  });

  // share bar
  const barX = 120;
  const barW = S - 240;
  const youW = barW * (1 - data.rhyPercent / 100);
  const r = 16;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(barX, 560, barW, 32, r);
  ctx.fill();
  ctx.fillStyle = "#34d399";
  ctx.beginPath();
  ctx.roundRect(barX, 560, Math.max(youW, 8), 32, r);
  ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(barX + youW, 560, Math.max(barW - youW, 8), 32, r);
  ctx.fill();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "44px system-ui, sans-serif";
  ctx.fillText(
    `⏱ ${data.durationText}${data.paceText ? `  ·  ${data.paceText}` : ""}`,
    S / 2,
    680
  );

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillText(data.raceText, S / 2, 780, S - 140);

  ctx.fillStyle = "#64748b";
  ctx.font = "38px system-ui, sans-serif";
  ctx.fillText(
    `Rhy today: ${data.kmh.toFixed(1)} km/h${
      data.tempC !== null ? ` · ${data.tempC.toFixed(1)} °C` : ""
    }`,
    S / 2,
    870
  );

  ctx.fillStyle = "#475569";
  ctx.font = "34px system-ui, sans-serif";
  ctx.fillText("Made in Basel 🇨🇭 · am Rhy dehei", S / 2, 990);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
  const file = new File([blob], "rhyschwumm.png", { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rhyschwumm.png";
  a.click();
  URL.revokeObjectURL(url);
}
