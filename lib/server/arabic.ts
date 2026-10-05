/**
 * Server-only helper for ani-cli-arabic private PHP API.
 * Mirrors src/api.py: APICache + AnimeAPI (search, episodes, servers, mediafire scrape)
 * Secrets stay server-side — never import this from client components.
 */

export const dynamic = "force-dynamic";

const ENDPOINT_URL =
  process.env.ANI_CLI_AR_ENDPOINT || "https://api.ani-cli-arabic.dev";
const AUTH_SECRET =
  process.env.ANI_CLI_AR_AUTH_SECRET || "6rK9z0XyW8vQ3J7pL2mN4sB1tH5gD0fA";

export type ArabicCreds = {
  ANI_CLI_AR_API_BASE: string;
  ANI_CLI_AR_TOKEN: string;
  THUMBNAILS_BASE_URL: string;
  TRAILERS_BASE_URL: string;
};

function defaultCreds(): ArabicCreds {
  return {
    ANI_CLI_AR_API_BASE: "",
    ANI_CLI_AR_TOKEN: "",
    THUMBNAILS_BASE_URL: "",
    TRAILERS_BASE_URL: "",
  };
}

function normalizeCreds(data: unknown): ArabicCreds {
  const d = (data || {}) as Record<string, unknown>;
  return {
    ANI_CLI_AR_API_BASE: String(d.ANI_CLI_AR_API_BASE || ""),
    ANI_CLI_AR_TOKEN: String(d.ANI_CLI_AR_TOKEN || ""),
    THUMBNAILS_BASE_URL: String(d.THUMBNAILS_BASE_URL || ""),
    TRAILERS_BASE_URL: String(d.TRAILERS_BASE_URL || ""),
  };
}

// In-memory cache with TTL (serverless-friendly)
let credsCache: { data: ArabicCreds; at: number } | null = null;
const CREDS_TTL_MS = 30 * 60 * 1000;

export async function getArabicCreds(): Promise<ArabicCreds> {
  if (credsCache && Date.now() - credsCache.at < CREDS_TTL_MS) {
    if (credsCache.data.ANI_CLI_AR_API_BASE && credsCache.data.ANI_CLI_AR_TOKEN)
      return credsCache.data;
  }
  try {
    const res = await fetch(`${ENDPOINT_URL}/credentials`, {
      headers: {
        "X-Auth-Key": AUTH_SECRET,
        "User-Agent": "AniCliAr/2.0",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as unknown;
      const norm = normalizeCreds(json);
      if (norm.ANI_CLI_AR_API_BASE && norm.ANI_CLI_AR_TOKEN) {
        credsCache = { data: norm, at: Date.now() };
        return norm;
      }
    }
  } catch {
    // fall through to cache / defaults
  }
  if (credsCache) return credsCache.data;
  return defaultCreds();
}

export function getApiBaseSync(creds: ArabicCreds): string {
  return creds.ANI_CLI_AR_API_BASE || "";
}
export function getTokenSync(creds: ArabicCreds): string {
  return creds.ANI_CLI_AR_TOKEN || "";
}
export function getThumbsBaseSync(creds: ArabicCreds): string {
  return creds.THUMBNAILS_BASE_URL || "";
}

/* ── Types mirroring AnimeResult / Episode ── */
export type ArabicAnimeItem = {
  id: string; // AnimeId
  title_en: string;
  title_jp: string;
  type: string;
  episodes: string;
  status: string;
  genres: string;
  mal_id: string;
  relation_id: string;
  score: string;
  rank: string;
  popularity: string;
  rating: string;
  premiered: string;
  creators: string;
  duration: string;
  thumbnail: string;
  title_romaji: string;
  trailer: string;
  yt_trailer: string;
};

export type ArabicEpisode = {
  number: string; // raw episode num as returned
  type: string;
  display_num: number; // numeric for sorting / player
};

export type ArabicServerKey = "FRLowQ" | "FRLink" | "FRFhdQ";
export const QUALITY_MAP: Record<string, ArabicServerKey> = {
  "480p": "FRLowQ",
  "720p": "FRLink",
  "1080p": "FRFhdQ",
};
export const SERVER_KEY_TO_LABEL: Record<ArabicServerKey, string> = {
  FRLowQ: "480p",
  FRLink: "720p",
  FRFhdQ: "1080p",
};

function parseAnimeResult(item: Record<string, unknown>, thumbsBase: string): ArabicAnimeItem {
  const thumbFile = String(item.Thumbnail || "");
  return {
    id: String(item.AnimeId || ""),
    title_en: String(item.EN_Title || "Unknown"),
    title_jp: String(item.JP_Title || ""),
    type: String(item.Type || "N/A"),
    episodes: String(item.Episodes ?? "N/A"),
    status: String(item.Status || "N/A"),
    genres: String(item.Genres || "N/A"),
    mal_id: String(item.MalId ?? "0"),
    relation_id: String(item.RelationId || ""),
    score: String(item.Score ?? "N/A"),
    rank: String(item.Rank ?? "N/A"),
    popularity: String(item.Popularity ?? "N/A"),
    rating: String(item.Rating || "N/A"),
    premiered: String(item.Season || "N/A"),
    creators: String(item.Creators || "N/A"),
    duration: String(item.Duration ?? "N/A"),
    thumbnail: thumbFile ? thumbsBase + thumbFile : "",
    title_romaji: String(item.EN_Title || ""),
    trailer: String(item.Trailer || ""),
    yt_trailer: String(item.YTTrailer || ""),
  };
}

async function postForm(
  url: string,
  payload: Record<string, string>,
  timeoutMs = 10000
): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = new URLSearchParams(payload).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Paginated helper — matches _paginate_requests in api.py */
async function paginateAnime(
  endpoint: string,
  basePayload: Record<string, string>,
  token: string,
  limit: number,
  fromIndex: number,
  thumbsBase: string
): Promise<ArabicAnimeItem[]> {
  const out: ArabicAnimeItem[] = [];
  let currentFrom = fromIndex;
  while (out.length < limit) {
    const payload: Record<string, string> = {
      ...basePayload,
      From: String(currentFrom),
      Token: token,
    };
    try {
      const data = (await postForm(endpoint, payload)) as unknown;
      if (!Array.isArray(data) || data.length === 0) break;
      const batch = (data as Record<string, unknown>[])
        .filter((x) => typeof x === "object" && x !== null)
        .map((x) => parseAnimeResult(x, thumbsBase));
      out.push(...batch);
      if (batch.length < 10) break;
      currentFrom += batch.length;
    } catch {
      break;
    }
  }
  return out.slice(0, limit);
}

export async function searchArabicAnime(
  query: string,
  limitPerType = 20
): Promise<ArabicAnimeItem[]> {
  const creds = await getArabicCreds();
  const base = getApiBaseSync(creds);
  const token = getTokenSync(creds);
  const thumbs = getThumbsBaseSync(creds);
  if (!base || !token) return [];

  const endpoint = base + "anime/load_anime_list_v2.php";
  const [series, movies] = await Promise.all([
    paginateAnime(
      endpoint,
      { UserId: "0", Language: "English", FilterType: "SEARCH", FilterData: query, Type: "SERIES" },
      token,
      limitPerType,
      0,
      thumbs
    ),
    paginateAnime(
      endpoint,
      { UserId: "0", Language: "English", FilterType: "SEARCH", FilterData: query, Type: "MOVIE" },
      token,
      limitPerType,
      0,
      thumbs
    ),
  ]);
  return [...series, ...movies];
}

export async function getArabicEpisodes(animeId: string): Promise<ArabicEpisode[]> {
  const creds = await getArabicCreds();
  const base = getApiBaseSync(creds);
  const token = getTokenSync(creds);
  if (!base || !token || !animeId) return [];

  const endpoint = base + "episodes/load_episodes.php";
  try {
    const data = (await postForm(endpoint, {
      AnimeID: String(animeId),
      Token: token,
    })) as unknown;
    if (!Array.isArray(data)) return [];
    const episodes: ArabicEpisode[] = [];
    let idx = 0;
    for (const ep of data as Record<string, unknown>[]) {
      idx++;
      if (typeof ep !== "object" || ep === null) continue;
      const epNum = String(ep.Episode ?? String(idx));
      const epType = String(ep.Type || "Episode") || "Episode";
      let displayNum: number;
      try {
        const s = String(epNum);
        displayNum = s.includes(".") ? parseFloat(s) : parseInt(s, 10);
        if (Number.isNaN(displayNum)) displayNum = idx;
      } catch {
        displayNum = idx;
      }
      episodes.push({ number: epNum, type: epType, display_num: displayNum });
    }
    return episodes;
  } catch {
    return [];
  }
}

export async function getArabicServers(
  animeId: string,
  episodeNum: string,
  animeType: string = "SERIES"
): Promise<Record<string, unknown> | null> {
  const creds = await getArabicCreds();
  const base = getApiBaseSync(creds);
  const token = getTokenSync(creds);
  if (!base || !token) return null;

  const endpoint = base + "anime/load_servers.php";
  try {
    const data = await postForm(endpoint, {
      UserId: "0",
      AnimeId: String(animeId),
      Episode: String(episodeNum),
      AnimeType: String(animeType || "SERIES"),
      Token: token,
    });
    if (typeof data === "object" && data !== null) return data as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function buildMediafireUrl(serverId: string): string {
  if (!serverId) return "";
  if (serverId.startsWith("http")) return serverId;
  return `https://www.mediafire.com/file/${serverId}`;
}

/**
 * Scrape MediaFire page for direct download link.
 * Mirrors AnimeAPI.extract_mediafire_direct in api.py
 */
export async function extractMediafireDirect(mfUrl: string): Promise<string | null> {
  if (!mfUrl) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(mfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    // Primary pattern from api.py
    let m = html.match(/https:\/\/download[^"]+/);
    if (m) return m[0].replace(/\\u002F/g, "/").replace(/&amp;/g, "&");
    // Fallbacks for variant markup
    m = html.match(/aria-label="Download file"[^>]*href="([^"]+)"/i);
    if (m) return m[1].replace(/&amp;/g, "&");
    m = html.match(/href="(https:\/\/download[^"]+)"/i);
    if (m) return m[1].replace(/&amp;/g, "&");
    return null;
  } catch {
    return null;
  }
}
