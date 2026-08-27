import { NextRequest, NextResponse } from "next/server";
import { ANILIST_STATUS_AR, stripHtml } from "@/lib/anime";

/* ── AniList GraphQL (المصدر الرئيسي — أثبت من Jikan) ── */
const ANILIST_BY_MAL = `query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) {
    idMal
    title { romaji english }
    episodes
    averageScore
    status
    description
    coverImage { large }
    genres
  }
}`;

async function fromAniList(malId: string) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_BY_MAL, variables: { idMal: Number(malId) } }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const data = await res.json();
  const row = data?.data?.Media;
  if (!row) return null;

  const title = (row.title || {}) as { romaji?: string; english?: string };

  return {
    mal_id: row.idMal,
    title: title.romaji || title.english,
    episodes: typeof row.episodes === "number" ? row.episodes : undefined,
    score: row.averageScore ? (Number(row.averageScore) / 10).toFixed(2) : undefined,
    status: row.status ? (ANILIST_STATUS_AR[String(row.status)] ?? String(row.status)) : undefined,
    description: row.description ? stripHtml(String(row.description)) : undefined,
    poster: row.coverImage?.large || undefined,
    genres: Array.isArray(row.genres) ? row.genres : undefined,
  };
}

/* ── Jikan (احتياطي إن تعطّل AniList) ── */
async function fromJikan(malId: string) {
  const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const data = await res.json();
  const row = data.data;
  if (!row) return null;

  return {
    mal_id: row.mal_id,
    title: row.title,
    episodes: typeof row.episodes === "number" ? row.episodes : undefined,
    score: row.score ? String(row.score) : undefined,
    status: row.status,
    description: row.synopsis,
    poster: row.images?.jpg?.large_image_url || row.images?.jpg?.image_url,
    genres: row.genres?.map((g: { name: string }) => g.name),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ malId: string }> }
) {
  const { malId } = await params;

  try {
    const info = await fromAniList(malId);
    if (info) return NextResponse.json(info);
    return NextResponse.json({});
  } catch {
    try {
      const info = await fromJikan(malId);
      if (info) return NextResponse.json(info);
      return NextResponse.json({});
    } catch {
      return NextResponse.json({}, { status: 500 });
    }
  }
}
