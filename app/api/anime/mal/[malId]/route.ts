import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ malId: string }> }
) {
  const { malId } = await params;

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({}, { status: 502 });
    }

    const data = await res.json();
    const row = data.data;
    if (!row) return NextResponse.json({});

    return NextResponse.json({
      mal_id: row.mal_id,
      title: row.title,
      episodes: typeof row.episodes === "number" ? row.episodes : undefined,
      score: row.score ? String(row.score) : undefined,
      status: row.status,
      description: row.synopsis,
      poster: row.images?.jpg?.large_image_url || row.images?.jpg?.image_url,
      genres: row.genres?.map((g: { name: string }) => g.name),
    });
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
