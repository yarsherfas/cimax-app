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
const VIDKING_PARAMS = "color=729C65&autoPlay=true";
const VIDKING_TV_PARAMS = `${VIDKING_PARAMS}&nextEpisode=true`;

export function buildEmbedUrl(
  server: string,
  type: "movie" | "tv",
  id: number,
  season: number,
  episode: number
) {
  const m = type === "movie";
  switch (server) {
    case "vidking":
      return m
        ? `https://www.vidking.net/embed/movie/${id}?${VIDKING_PARAMS}`
        : `https://www.vidking.net/embed/tv/${id}/${season}/${episode}?${VIDKING_TV_PARAMS}`;
    case "vidsrc":
      return m
        ? `https://vidsrc.to/embed/movie?tmdb=${id}&ds_lang=ar`
        : `https://vidsrc.to/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=ar`;
    case "vidsrcru":
      return m
        ? `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&ds_lang=ar`
        : `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=ar`;
    case "vidsrcme":
      return m
        ? `https://vidsrcme.su/embed/movie/${id}`
        : `https://vidsrcme.su/embed/tv/${id}/${season}/${episode}`;
    case "vidsrcwiki":
      return m
        ? `https://vidsrc.wiki/embed/movie/${id}?autoplay=1&color=2563eb`
        : `https://vidsrc.wiki/embed/tv/${id}/${season}/${episode}?autoplay=1&color=2563eb`;
    case "vidlink":
      return m
        ? `https://vidlink.pro/movie/${id}?primaryColor=2563eb&secondaryColor=0d1520&iconColor=60a5fa&autoplay=true&title=true&poster=true`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=2563eb&secondaryColor=0d1520&iconColor=60a5fa&autoplay=true&nextbutton=true`;
    case "vidrock":
      return m
        ? `https://vidrock.net/movie/${id}?autoplay=true`
        : `https://vidrock.net/tv/${id}/${season}/${episode}?autoplay=true&autonext=true`;
    case "vidnest":
      return m
        ? `https://vidnest.fun/movie/${id}`
        : `https://vidnest.fun/tv/${id}/${season}/${episode}`;
    case "flixer":
      return m
        ? `https://flixer.su/watch/movie/${id}`
        : `https://flixer.su/watch/tv/${id}/${season}/${episode}`;
    case "twoembed":
      return m
        ? `https://www.2embed.cc/embed/tmdb/movie?id=${id}`
        : `https://www.2embed.cc/embed/tmdb/tv?id=${id}&s=${season}&e=${episode}`;
    case "autoembed":
      return m
        ? `https://autoembed.co/movie/tmdb/${id}`
        : `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
    case "moviesapi":
      return m
        ? `https://moviesapi.to/movie/${id}`
        : `https://moviesapi.to/tv/${id}-${season}-${episode}`;
    case "multiembed":
    default:
      return m
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
  }
}

export const SERVERS = [
  { id: "vidking",    name: "VidKing",    ar: false },
  { id: "vidsrc",     name: "VidSrc",     ar: true  },
  { id: "vidsrcru",   name: "VidSrc RU",  ar: true  },
  { id: "vidlink",    name: "VidLink",    ar: true  },
  { id: "vidsrcme",   name: "VidSrc ME",  ar: false },
  { id: "vidsrcwiki", name: "VidSrc Wiki",ar: false },
  { id: "vidrock",    name: "VidRock",    ar: false },
  { id: "vidnest",    name: "VidNest",    ar: false },
  { id: "flixer",     name: "Flixer",     ar: false },
  { id: "twoembed",   name: "2Embed",     ar: false },
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
