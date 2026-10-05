export type AniPmLang = "sub" | "dub" | "vostfr";

export type AniPmAvailability = {
  sub: boolean;
  dub: boolean;
  subHard: boolean;
  dubHard: boolean;
};

export type AniPmEpisode = {
  number: number;
  title?: string | null;
  runtimeSeconds?: number | null;
  available: AniPmAvailability;
  embed: { sub: string; dub: string };
};

export type AniPmSeriesResult = {
  anilistId: number;
  malId: number | null;
  title: string;
  episodeList: AniPmEpisode[];
  raw: unknown;
};

const ANIPM_EMBED_ORIGIN = "https://ani.pm";
const ANIPM_COLOR = "7c3aed"; // violet accent — no '#'

export function buildAniPmEmbedUrl(opts: {
  anilistId?: number;
  malId?: number;
  episode: number;
  lang: AniPmLang;
  color?: string;
  autoplay?: 0 | 1;
  autonext?: 0 | 1;
  autoskip?: 0 | 1;
  adult?: 0 | 1;
  start?: number;
}): string {
  const { episode, lang, color, autoplay, autonext, autoskip, adult, start } = opts;

  let base: string;
  if (opts.anilistId) {
    base = `${ANIPM_EMBED_ORIGIN}/embed/ani/${opts.anilistId}/${episode}/${lang}`;
  } else if (opts.malId) {
    base = `${ANIPM_EMBED_ORIGIN}/embed/mal/${opts.malId}/${episode}/${lang}`;
  } else {
    throw new Error("buildAniPmEmbedUrl: anilistId or malId is required");
  }

  const params = new URLSearchParams();
  params.set("color", (color ?? ANIPM_COLOR).replace(/^#/, ""));
  if (autoplay !== undefined) params.set("autoplay", String(autoplay));
  if (autonext !== undefined) params.set("autonext", String(autonext));
  if (autoskip !== undefined) params.set("autoskip", String(autoskip));
  if (adult !== undefined) params.set("adult", String(adult));
  if (start !== undefined && start > 0) params.set("start", String(start));

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getAniPmPreferredId(item: {
  ani_id?: number;
  mal_id: number;
}): { by: "ani" | "mal"; id: number } {
  if (item.ani_id) return { by: "ani", id: item.ani_id };
  return { by: "mal", id: item.mal_id };
}

export async function fetchAniPmSeries(
  id: number | string,
  by: "ani" | "mal" = "ani"
): Promise<AniPmSeriesResult | null> {
  const res = await fetch(`/api/anime/anipm/series/${id}?by=${by}`);
  if (!res.ok) return null;
  const json = await res.json();
  // proxy returns { data, episodeList } on success, { error } on failure
  if (json.error || !json.data) return null;
  return {
    anilistId: json.data.anilistId,
    malId: json.data.malId ?? null,
    title: json.data.title ?? "",
    episodeList: (json.data.episodeList ?? []) as AniPmEpisode[],
    raw: json.data,
  };
}

export function isAniPmEpisodeAvailable(
  episodeList: AniPmEpisode[],
  episodeNumber: number,
  lang: AniPmLang
): boolean {
  const ep = episodeList.find((e) => e.number === episodeNumber);
  if (!ep) return false;
  if (lang === "dub") return ep.available.dub;
  if (lang === "vostfr") return ep.available.sub; // French subs ride on sub availability
  return ep.available.sub;
}
