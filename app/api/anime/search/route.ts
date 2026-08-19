import { NextRequest, NextResponse } from "next/server";
import type { AnimeItem } from "@/lib/anime";

function mapJikan(row: Record<string, unknown>): AnimeItem | null {
  const malId = Number(row.mal_id);
  if (!malId) return null;

  const images = row.images as { jpg?: { large_image_url?: string; image_url?: string } } | undefined;
  const poster =
    images?.jpg?.large_image_url ||
    images?.jpg?.image_url ||
    "";

  return {
    id: malId,
    mal_id: malId,
    title: String(row.title || "بلا عنوان"),
    poster,
    description: row.synopsis ? String(row.synopsis) : undefined,
    episodes: typeof row.episodes === "number" ? row.episodes : undefined,
    score: row.score ? String(row.score) : undefined,
    status: row.status ? String(row.status) : undefined,
    aired: row.aired ? String((row.aired as { string?: string }).string || "") : undefined,
    year: row.year ? Number(row.year) : undefined,
    genres: Array.isArray(row.genres)
      ? row.genres.map((g: { name?: string }) => g.name).filter(Boolean) as string[]
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ items: [] });

  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=24`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Search unavailable", items: [] }, { status: 502 });
    }

    const data = await res.json();
    const items = (data.data || [])
      .map(mapJikan)
      .filter((x: AnimeItem | null): x is AnimeItem => x !== null && !!x.poster);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Search failed", items: [] }, { status: 500 });
  }
}
