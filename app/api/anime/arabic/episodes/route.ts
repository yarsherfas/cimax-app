import { NextRequest, NextResponse } from "next/server";
import { getArabicEpisodes } from "@/lib/server/arabic";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const animeId = req.nextUrl.searchParams.get("animeId")?.trim();
  if (!animeId) {
    return NextResponse.json({ error: "animeId required", episodes: [] }, { status: 400 });
  }

  try {
    const episodes = await getArabicEpisodes(animeId);
    return NextResponse.json(
      { episodes },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load episodes";
    return NextResponse.json({ error: msg, episodes: [] }, { status: 500 });
  }
}
