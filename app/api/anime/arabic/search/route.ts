import { NextRequest, NextResponse } from "next/server";
import { searchArabicAnime } from "@/lib/server/arabic";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const locale = req.nextUrl.searchParams.get("lang") || "ar";
  if (!q) return NextResponse.json({ items: [], source: "arabic" });

  try {
    const items = await searchArabicAnime(q, 20);
    // Return raw items plus mapped minimal form for compatibility
    const localeStr = locale === "en" ? "en" : "ar";
    // Map to a shape close to AnimeItem for reuse, but keep arabic extras
    const mapped = items.map((a) => ({
      arabicId: a.id,
      mal_id: Number(a.mal_id) || 0,
      title: a.title_en,
      title_jp: a.title_jp,
      title_romaji: a.title_romaji,
      poster: a.thumbnail,
      score: a.score,
      status: a.status,
      type: a.type,
      episodes: a.episodes,
      genres: a.genres,
      rating: a.rating,
      premiered: a.premiered,
      duration: a.duration,
      trailer: a.trailer,
      yt_trailer: a.yt_trailer,
      // keep original for debugging
      _raw: a,
    }));
    return NextResponse.json(
      { items: mapped, raw: items, source: "arabic" },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: msg, items: [], source: "arabic" }, { status: 500 });
  }
}
