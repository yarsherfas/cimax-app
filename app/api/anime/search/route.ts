import { NextRequest, NextResponse } from "next/server";
import { ANILIST_STATUS_AR, stripHtml } from "@/lib/anime";
import type { AnimeItem } from "@/lib/anime";

/* ── AniList GraphQL (المصدر الرئيسي — أثبت من Jikan) ── */
const ANILIST_SEARCH = `query ($s: String) {
  Page(page: 1, perPage: 24) {
    media(search: $s, type: ANIME, sort: SEARCH_MATCH) {
      idMal
      title { romaji english }
      coverImage { large }
      description
      episodes
      averageScore
      status
      seasonYear
      genres
    }
  }
}`;

function mapAniList(row: Record<string, unknown>): AnimeItem | null {
  const malId = Number(row.idMal);
  /* بعض أعمال AniList بلا صفحة MAL — لا يمكن تشغيلها عبر MegaPlay فتُستبعد */
  if (!malId) return null;

  const title = (row.title || {}) as { romaji?: string; english?: string };
  const cover = row.coverImage as { large?: string } | undefined;

  return {
    id: malId,
    mal_id: malId,
    title: String(title.romaji || title.english || "بلا عنوان"),
    poster: cover?.large || "",
    description: row.description ? stripHtml(String(row.description)) : undefined,
    episodes: typeof row.episodes === "number" ? row.episodes : undefined,
    score: row.averageScore ? (Number(row.averageScore) / 10).toFixed(2) : undefined,
    status: row.status ? (ANILIST_STATUS_AR[String(row.status)] ?? String(row.status)) : undefined,
    year: row.seasonYear ? Number(row.seasonYear) : undefined,
    genres: Array.isArray(row.genres) ? (row.genres as string[]) : undefined,
  };
}

async function searchAniList(q: string): Promise<AnimeItem[]> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_SEARCH, variables: { s: q } }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const data = await res.json();
  if (data?.errors) throw new Error("AniList GraphQL error");
  return (data?.data?.Page?.media || [])
    .map(mapAniList)
    .filter((x: AnimeItem | null): x is AnimeItem => x !== null && !!x.poster);
}

/* ── Jikan (احتياطي إن تعطّل AniList) ── */
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

async function searchJikan(q: string): Promise<AnimeItem[]> {
  const res = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=24`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const data = await res.json();
  return (data.data || [])
    .map(mapJikan)
    .filter((x: AnimeItem | null): x is AnimeItem => x !== null && !!x.poster);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ items: [] });

  try {
    const items = await searchAniList(q);
    return NextResponse.json({ items, source: "anilist" });
  } catch {
    try {
      const items = await searchJikan(q);
      return NextResponse.json({ items, source: "jikan" });
    } catch {
      return NextResponse.json({ error: "Search failed", items: [] }, { status: 500 });
    }
  }
}
