import { NextRequest, NextResponse } from "next/server";
import { mapAnikotoList } from "@/lib/anime";
import type { AnimeEpisode } from "@/lib/anime";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const res = await fetch(`https://anikotoapi.site/series/${id}`, {
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json({ anime: null, episodes: [] });
    }

    const data = await res.json();
    const anime = mapAnikotoList(data.anime ? [data.anime] : [])[0] ?? null;

    const episodes: AnimeEpisode[] = (data.episodes || []).map(
      (ep: Record<string, unknown>) => ({
        number: Number(ep.episode_no || ep.number || ep.episode_number || 0),
        title: ep.title ? String(ep.title) : undefined,
        embed_id: ep.episode_embed_id ? String(ep.episode_embed_id) : undefined,
        has_sub: !!(ep.embed_url as { sub?: string } | undefined)?.sub,
        has_dub: !!(ep.embed_url as { dub?: string } | undefined)?.dub,
      })
    ).filter((ep: AnimeEpisode) => ep.number > 0);

    return NextResponse.json({ anime, episodes });
  } catch {
    return NextResponse.json({ anime: null, episodes: [] });
  }
}
