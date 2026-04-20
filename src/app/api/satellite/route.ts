import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lon = parseFloat(searchParams.get("lon") ?? "0");
  /** Half-width of bbox in degrees (lon). Larger = wider / more city context. */
  const spanRaw = searchParams.get("span") ?? searchParams.get("zoom");
  const parsed = spanRaw != null && spanRaw !== "" ? parseFloat(spanRaw) : NaN;
  const halfLon = Number.isFinite(parsed) && parsed > 0 ? parsed : 0.022;

  const west = lon - halfLon;
  const east = lon + halfLon;
  const south = lat - halfLon * 0.65;
  const north = lat + halfLon * 0.65;

  // Try providers in order until one succeeds
  const providers = [
    // Esri World Imagery (primary)
    `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=900,560&format=png32&f=image&transparent=false`,
    // Esri fallback endpoint
    `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=900,560&format=png32&f=image`,
  ];

  for (const url of providers) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "EarthPulse/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok && res.headers.get("content-type")?.startsWith("image")) {
        const buf = await res.arrayBuffer();
        return new NextResponse(buf, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Could not fetch satellite image" }, { status: 502 });
}
