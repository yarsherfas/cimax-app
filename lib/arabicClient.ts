/** Client helpers for Arabic hard-sub streaming (calls /api/anime/arabic/*) */

export type ArabicSearchItem = {
  arabicId: string;
  mal_id: number;
  title: string;
  title_jp?: string;
  poster?: string;
  score?: string;
  status?: string;
  type?: string;
  episodes?: string;
  genres?: string;
};

export type ArabicEpisodeClient = {
  number: string;
  type: string;
  display_num: number;
};

export type ArabicStreamResult = {
  url: string;
  quality: string;
  serverKey: string;
  mediafire: string;
  available: { quality: string; serverKey: string }[];
};

export async function searchArabicAnimeClient(q: string): Promise<ArabicSearchItem[]> {
  const res = await fetch(`/api/anime/arabic/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []) as ArabicSearchItem[];
}

export async function fetchArabicEpisodesClient(arabicId: string): Promise<ArabicEpisodeClient[]> {
  const res = await fetch(`/api/anime/arabic/episodes?animeId=${encodeURIComponent(arabicId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.episodes || []) as ArabicEpisodeClient[];
}

export async function fetchArabicStreamClient(
  arabicId: string,
  episode: string | number,
  quality: string = "1080p",
  animeType: string = "SERIES"
): Promise<ArabicStreamResult | null> {
  const qs = new URLSearchParams({
    animeId: String(arabicId),
    episode: String(episode),
    quality,
    type: animeType,
  });
  const res = await fetch(`/api/anime/arabic/stream?${qs.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.url) return null;
  return data as ArabicStreamResult;
}
