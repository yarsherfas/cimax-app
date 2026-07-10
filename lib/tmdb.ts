const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export const IMG      = "https://image.tmdb.org/t/p/w342";
export const IMG_LG   = "https://image.tmdb.org/t/p/w780";
export const BACKDROP  = "https://image.tmdb.org/t/p/original";

export async function tmdb(
  path: string,
  params: Record<string, string | number> = {}
) {
  if (!API_KEY) throw new Error("مفتاح TMDB غير موجود في .env.local");
  const qs = new URLSearchParams({
    api_key: API_KEY,
    language: "ar",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${BASE}${path}?${qs}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

/* ── روابط السيرفرات ── */
export function buildEmbedUrl(
  server: string,
  type: "movie" | "tv",
  id: number,
  season: number,
  episode: number
) {
  const m = type === "movie";
  switch (server) {
    case "vidsrc":
      return m
        ? `https://vidsrc.to/embed/movie?tmdb=${id}&ds_lang=ar`
        : `https://vidsrc.to/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=ar`;
    case "vidsrcxyz":
      return m
        ? `https://vidsrc.xyz/embed/movie/${id}`
        : `https://vidsrc.xyz/embed/tv/${id}/${season}/${episode}`;
    case "embedsu":
      return m
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${season}/${episode}`;
    case "vidlink":
      return m
        ? `https://vidlink.pro/movie/${id}?primaryColor=2563eb&secondaryColor=0d1520&iconColor=60a5fa&autoplay=true&title=true&poster=true`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=2563eb&secondaryColor=0d1520&iconColor=60a5fa&autoplay=true&nextbutton=true`;
    case "autoembed":
      return m
        ? `https://autoembed.co/movie/tmdb/${id}`
        : `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
    case "moviesapi":
      return m
        ? `https://moviesapi.club/movie/${id}`
        : `https://moviesapi.club/tv/${id}-${season}-${episode}`;
    case "multiembed":
    default:
      return m
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
  }
}

export const SERVERS = [
  { id: "vidsrc",     name: "VidSrc",     ar: true  },
  { id: "vidlink",    name: "VidLink",    ar: true  },
  { id: "embedsu",    name: "Embed.su",   ar: false },
  { id: "vidsrcxyz",  name: "VidSrc XYZ", ar: false },
  { id: "autoembed",  name: "AutoEmbed",  ar: false },
  { id: "moviesapi",  name: "MoviesAPI",  ar: false },
  { id: "multiembed", name: "MultiEmbed", ar: false },
];

export const GENRES_MOVIE: Record<number, string> = {
  28: "أكشن", 12: "مغامرة", 16: "أنيميشن", 35: "كوميدي",
  80: "جريمة", 18: "دراما", 14: "فانتازيا", 27: "رعب",
  9648: "غموض", 10749: "رومانسي", 878: "خيال علمي",
  53: "إثارة", 10751: "عائلي", 99: "وثائقي",
};
export const GENRES_TV: Record<number, string> = {
  10759: "أكشن ومغامرة", 16: "أنيميشن", 35: "كوميدي",
  80: "جريمة", 18: "دراما", 10751: "عائلي",
  9648: "غموض", 10765: "خيال وفانتازيا", 37: "وسترن",
};

export type MediaType = "movie" | "tv";
export type MediaItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: string;
};
export type Episode = {
  id: number;
  episode_number: number;
  name: string;
  air_date?: string;
  still_path?: string | null;
  overview?: string;
};
