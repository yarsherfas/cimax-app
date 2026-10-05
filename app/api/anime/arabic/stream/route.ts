import { NextRequest, NextResponse } from "next/server";
import {
  getArabicServers,
  buildMediafireUrl,
  extractMediafireDirect,
  QUALITY_MAP,
  SERVER_KEY_TO_LABEL,
  type ArabicServerKey,
} from "@/lib/server/arabic";

export const dynamic = "force-dynamic";

/**
 * GET /api/anime/arabic/stream?animeId=...&episode=...&quality=1080p&type=SERIES
 * Returns { url, quality, serverKey, mediafire, available } — url is direct download MP4 (Arabic hard-sub).
 * Supports quality fallback: if requested quality missing, tries 1080p → 720p → 480p.
 */
export async function GET(req: NextRequest) {
  const animeId = req.nextUrl.searchParams.get("animeId")?.trim();
  const episode = req.nextUrl.searchParams.get("episode")?.trim();
  const qualityParam = (req.nextUrl.searchParams.get("quality") || "1080p").trim();
  const animeType = (req.nextUrl.searchParams.get("type") || "SERIES").trim() || "SERIES";

  if (!animeId || !episode) {
    return NextResponse.json(
      { error: "animeId and episode are required" },
      { status: 400 }
    );
  }

  try {
    const serverData = await getArabicServers(animeId, episode, animeType);
    if (!serverData) {
      return NextResponse.json({ error: "No servers available for this episode", available: [] }, { status: 404 });
    }

    const current = (serverData.CurrentEpisode || serverData.currentEpisode || {}) as Record<string, string>;

    // Determine available qualities
    const available: { quality: string; serverKey: ArabicServerKey }[] = [];
    for (const [label, key] of Object.entries(QUALITY_MAP)) {
      if (current[key]) available.push({ quality: label, serverKey: key });
    }

    if (available.length === 0) {
      return NextResponse.json(
        { error: "No MediaFire servers found for this episode", available: [] },
        { status: 404 }
      );
    }

    // Try requested quality first, then fallback order 1080p → 720p → 480p
    const preference: string[] = [qualityParam, "1080p", "720p", "480p"];
    let chosen: { quality: string; serverKey: ArabicServerKey } | null = null;
    for (const pref of preference) {
      const key = QUALITY_MAP[pref];
      if (key && current[key]) {
        chosen = { quality: pref, serverKey: key };
        break;
      }
    }
    if (!chosen) chosen = available[0];

    const serverId = current[chosen.serverKey];
    if (!serverId) {
      return NextResponse.json({ error: "Missing server id", available }, { status: 404 });
    }

    const mediafire = buildMediafireUrl(serverId);
    const directUrl = await extractMediafireDirect(mediafire);

    if (!directUrl) {
      return NextResponse.json(
        { error: "Failed to extract direct link from MediaFire", mediafire, available, serverKey: chosen.serverKey },
        { status: 502 }
      );
    }

    // Support ?redirect=1 to 302 directly to the MP4 (useful for <video> src)
    if (req.nextUrl.searchParams.get("redirect") === "1") {
      return NextResponse.redirect(directUrl, 302);
    }

    return NextResponse.json(
      {
        url: directUrl,
        quality: chosen.quality,
        serverKey: chosen.serverKey,
        mediafire,
        available,
        expiresAt: null as string | null, // MediaFire links are short-lived but not timestamped
      },
      {
        headers: {
          // Direct links expire quickly — short private cache
          "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stream lookup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
