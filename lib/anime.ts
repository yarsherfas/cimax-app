export type AnimeLang = "sub" | "dub";

export type AnimeItem = {
  id: number;
  mal_id: number;
  ani_id?: number;
  title: string;
  poster: string;
  description?: string;
  episodes?: number;
  score?: string;
  status?: string;
  aired?: string;
  year?: number;
  genres?: string[];
  is_sub?: number;
  is_dub?: number;
};

export type AnimeEpisode = {
  number: number;
  title?: string;
  embed_id?: string;
  has_sub?: boolean;
  has_dub?: boolean;
};

export const ANIME_LANGS: { id: AnimeLang; name: string }[] = [
  { id: "sub", name: "مترجم" },
  { id: "dub", name: "مدبلج" },
];

export function buildAnimeEmbedUrl(
  malId: number,
  episode: number,
  lang: AnimeLang = "sub",
  embedId?: string
) {
  if (embedId) {
    return `https://megaplay.buzz/stream/s-2/${embedId}/${lang}`;
  }
  return `https://megaplay.buzz/stream/mal/${malId}/${episode}/${lang}`;
}

function parseEpisodes(value: unknown): number | undefined {
  if (typeof value === "number" && value > 0) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (n > 0) return n;
  }
  return undefined;
}

function mapAnikotoRow(row: Record<string, unknown>): AnimeItem | null {
  const malId = Number(row.mal_id);
  if (!malId) return null;

  const genres = row.terms_by_type as { genre?: string[] } | undefined;

  return {
    id: Number(row.id),
    mal_id: malId,
    ani_id: row.ani_id ? Number(row.ani_id) : undefined,
    title: String(row.title || row.titles || "بلا عنوان"),
    poster: String(row.poster || ""),
    description: row.description ? String(row.description) : undefined,
    episodes: parseEpisodes(row.episodes),
    score: row.score ? String(row.score) : undefined,
    status: row.status ? String(row.status) : undefined,
    aired: row.aired ? String(row.aired) : undefined,
    year: row.year ? Number(row.year) : undefined,
    genres: genres?.genre,
    is_sub: row.is_sub ? Number(row.is_sub) : undefined,
    is_dub: row.is_dub ? Number(row.is_dub) : undefined,
  };
}

export async function fetchRecentAnime(page = 1, perPage = 24): Promise<{
  items: AnimeItem[];
  page: number;
  totalPages: number;
}> {
  const res = await fetch(`/api/anime/recent?page=${page}&per_page=${perPage}`);
  if (!res.ok) throw new Error("تعذّر تحميل قائمة الأنيمي");
  const data = await res.json();
  const items = (data.items || []) as AnimeItem[];
  return {
    items,
    page: data.page ?? page,
    totalPages: data.totalPages ?? 1,
  };
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const res = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("تعذّر البحث عن أنيمي");
  const data = await res.json();
  return (data.items || []) as AnimeItem[];
}

export async function fetchAnimeSeries(anikotoId: number): Promise<{
  anime: AnimeItem | null;
  episodes: AnimeEpisode[];
}> {
  const res = await fetch(`/api/anime/series/${anikotoId}`);
  if (!res.ok) return { anime: null, episodes: [] };
  const data = await res.json();
  return {
    anime: data.anime ?? null,
    episodes: data.episodes ?? [],
  };
}

export async function fetchAnimeByMal(malId: number): Promise<Partial<AnimeItem>> {
  const res = await fetch(`/api/anime/mal/${malId}`);
  if (!res.ok) return {};
  return res.json();
}

export function mapAnikotoList(rows: Record<string, unknown>[]): AnimeItem[] {
  return rows.map(mapAnikotoRow).filter((x): x is AnimeItem => x !== null);
}

export function buildEpisodeList(count: number, fromApi: AnimeEpisode[] = []): AnimeEpisode[] {
  if (fromApi.length > 0) return fromApi;

  const total = Math.min(Math.max(count, 1), 200);
  return Array.from({ length: total }, (_, i) => ({ number: i + 1 }));
}

/* ── أدوات مشتركة لتحويل بيانات AniList (تُستخدم في مسارات API) ── */
export const ANILIST_STATUS_AR: Record<string, string> = {
  FINISHED: "مكتمل",
  RELEASING: "يُعرض حالياً",
  NOT_YET_RELEASED: "لم يُعرض بعد",
  CANCELLED: "ملغى",
  HIATUS: "متوقف مؤقتاً",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
