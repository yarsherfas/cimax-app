"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import {
  AnimeItem, AnimeEpisode, AnimeLang,
  ANIME_LANGS, buildAnimeEmbedUrl, buildEpisodeList,
  fetchAnimeByMal, fetchAnimeSeries,
} from "@/lib/anime";
import {
  AniPmEpisode, buildAniPmEmbedUrl, fetchAniPmSeries,
} from "@/lib/anipm";
import { FavBtn } from "./ui";
import { EmbedPlayer } from "./EmbedPlayer";
import { ArabicPlayer } from "./ArabicPlayer";
import { useLanguage } from "./LanguageProvider";
import { searchArabicAnimeClient, fetchArabicEpisodesClient } from "@/lib/arabicClient";

type PlayerSource = "embed" | "arabic";

export function AnimeModal({
  item, onClose, favSet, toggleFav,
}: {
  item: AnimeItem;
  onClose: () => void;
  favSet: Set<string>;
  toggleFav: (item: AnimeItem) => void;
}) {
  const { locale, t } = useLanguage();
  const [details, setDetails]       = useState<AnimeItem>(item);
  const [episodes, setEpisodes]     = useState<AnimeEpisode[]>([]);
  const [episode, setEpisode]       = useState(1);
  const [lang, setLang]             = useState<AnimeLang>("sub");
  const [reloadKey, setReloadKey]   = useState(0);
  const [loadingEps, setLoadingEps] = useState(true);

  // ani.pm availability — primary player; MegaPlay stays as fallback
  const [aniPmEpisodes, setAniPmEpisodes] = useState<AniPmEpisode[] | null>(null);
  const [aniPmReady, setAniPmReady]       = useState(false);
  const [forceFallback, setForceFallback] = useState(false);

  // ── Arabic hard-sub source (ani-cli-arabic PHP API + MediaFire) ──
  const [source, setSource] = useState<PlayerSource>("embed");
  const [arabicId, setArabicId] = useState<string | null>(null);
  const [arabicEpisodes, setArabicEpisodes] = useState<{ number: string; display_num: number }[] | null>(null);
  const [arabicReady, setArabicReady] = useState(false);
  const [arabicLoading, setArabicLoading] = useState(false);

  const isFav = favSet.has(`anime-${item.mal_id}`);

  /* Episode count & list: prefer source-aware catalogue */
  const embedEpisodeCount = aniPmEpisodes && aniPmEpisodes.length > 0 && !forceFallback
    ? aniPmEpisodes.length
    : (details.episodes || episodes.length || 12);

  const embedEpisodeList = aniPmEpisodes && aniPmEpisodes.length > 0 && !forceFallback
    ? aniPmEpisodes.map(ep => ({ number: ep.number, title: ep.title ?? undefined } as AnimeEpisode))
    : buildEpisodeList(embedEpisodeCount, episodes);

  const episodeCount = source === "arabic" && arabicEpisodes && arabicEpisodes.length > 0
    ? arabicEpisodes.length
    : embedEpisodeCount;

  const episodeList: AnimeEpisode[] = source === "arabic" && arabicEpisodes && arabicEpisodes.length > 0
    ? arabicEpisodes.map(e => ({ number: Number(e.display_num) || Number(e.number) || 0, title: undefined } as AnimeEpisode)).filter(e => e.number > 0)
    : embedEpisodeList;

  const genres = (details.genres || []).join(" · ");

  const epData = episodes.find(e => e.number === episode);
  const embedId = epData?.embed_id;

  // Per-episode ani.pm availability (sub/dub)
  const aniPmEpAvail = aniPmEpisodes?.find(e => e.number === episode)?.available ?? null;
  const canUseAniPm = !!aniPmEpisodes && aniPmEpisodes.length > 0 && !forceFallback;

  const url = canUseAniPm
    ? buildAniPmEmbedUrl({
        anilistId: details.ani_id,
        malId: details.mal_id,
        episode,
        lang,
        color: "7c3aed",
        autonext: 1,
      })
    : buildAnimeEmbedUrl(item.mal_id, episode, lang, embedId);

  const langs = useMemo(
    () => ANIME_LANGS.filter(l => {
      // When ani.pm is the active source, filter by its per-episode availability
      if (canUseAniPm && aniPmEpAvail) {
        if (l.id === "sub" && !aniPmEpAvail.sub) return false;
        if (l.id === "dub" && !aniPmEpAvail.dub) return false;
        return true;
      }
      if (l.id === "dub" && details.is_dub === 0) return false;
      if (epData?.has_sub === false && l.id === "sub") return false;
      if (epData?.has_dub === false && l.id === "dub") return false;
      return true;
    }),
    [canUseAniPm, aniPmEpAvail, details.is_dub, epData?.has_sub, epData?.has_dub],
  );

  /* تحميل تفاصيل المسلسل + الحلقات + بيانات MAL + توفّر ani.pm (المصدر الأساسي) */
  useEffect(() => {
    let alive = true;
    setLoadingEps(true);
    setAniPmReady(false);
    setForceFallback(false);
    setArabicId(null);
    setArabicEpisodes(null);
    setArabicReady(false);
    setSource("embed");

    (async () => {
      const [series, malInfo] = await Promise.all([
        fetchAnimeSeries(item.id),
        fetchAnimeByMal(item.mal_id, locale),
      ]);

      if (!alive) return;

      if (series.anime) {
        setDetails(prev => ({ ...prev, ...series.anime }));
      }
      if (series.episodes.length > 0) {
        setEpisodes(series.episodes);
      }
      const mergedAniId = (series.anime as AnimeItem | null)?.ani_id ?? item.ani_id;
      const mergedMalId = item.mal_id;
      if (malInfo.episodes) {
        setDetails(prev => ({ ...prev, ...malInfo, episodes: malInfo.episodes ?? prev.episodes }));
      }
      setLoadingEps(false);

      // Check ani.pm catalogue — prefer AniList id, fall back to MAL
      const by = mergedAniId ? "ani" as const : "mal" as const;
      const lookupId = mergedAniId ?? mergedMalId;
      try {
        const anipm = await fetchAniPmSeries(lookupId, by);
        if (!alive) return;
        if (anipm && anipm.episodeList.length > 0) {
          setAniPmEpisodes(anipm.episodeList);
          // Enrich ani_id if we learned it from ani.pm
          if (anipm.anilistId && !mergedAniId) {
            setDetails(prev => ({ ...prev, ani_id: anipm.anilistId }));
          }
        } else {
          setAniPmEpisodes(null);
        }
      } catch {
        if (alive) setAniPmEpisodes(null);
      } finally {
        if (alive) setAniPmReady(true);
      }
    })();

    return () => { alive = false; };
  }, [item.id, item.mal_id, locale]);

  // ── Resolve Arabic source in background (non-blocking) ──
  useEffect(() => {
    let alive = true;
    const titleForSearch = (details.title || item.title || "").trim();
    if (!titleForSearch) return;

    (async () => {
      setArabicLoading(true);
      try {
        const results = await searchArabicAnimeClient(titleForSearch);
        if (!alive || results.length === 0) {
          if (alive) { setArabicId(null); setArabicReady(true); }
          return;
        }
        // Prefer exact MAL match, then title contains
        let pick = results.find(r => r.mal_id && Number(r.mal_id) === Number(item.mal_id));
        if (!pick) {
          const qLower = titleForSearch.toLowerCase();
          pick = results.find(r => r.title.toLowerCase().includes(qLower) || qLower.includes(r.title.toLowerCase()));
        }
        if (!pick) pick = results[0];
        const aId = pick.arabicId;
        if (!alive) return;
        setArabicId(aId);
        // Fetch its episodes
        try {
          const eps = await fetchArabicEpisodesClient(aId);
          if (!alive) return;
          if (eps.length > 0) setArabicEpisodes(eps);
          else setArabicEpisodes(null);
        } catch {
          if (alive) setArabicEpisodes(null);
        }
      } catch {
        if (alive) { setArabicId(null); setArabicEpisodes(null); }
      } finally {
        if (alive) { setArabicReady(true); setArabicLoading(false); }
      }
    })();

    return () => { alive = false; };
  }, [details.title, item.title, item.mal_id]);

  /* إعادة تحميل المشغّل عند تغيّر اللغة/الحلقة/المصدر */
  useEffect(() => {
    setReloadKey(k => k + 1);
  }, [lang, episode, embedId, canUseAniPm, source, arabicId]);

  /* إن أصبحت اللغة الحالية غير متاحة للحلقة، عُد إلى المترجمة */
  useEffect(() => {
    if (langs.length > 0 && !langs.some(l => l.id === lang)) setLang("sub");
  }, [langs, lang]);

  /* Clamp episode when switching source with fewer episodes */
  useEffect(() => {
    if (episode > episodeCount) setEpisode(episodeCount);
  }, [episode, episodeCount]);

  /* انتهاء الحلقة عبر postMessage (ani.pm + MegaPlay) — انتقل للتالية تلقائياً */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isAniPm = origin === "https://ani.pm";
      const isMega = origin.includes("megaplay.buzz");
      if (!isAniPm && !isMega) return;

      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }

      const isComplete =
        data?.event === "complete" ||
        (data?.channel === "megacloud" && data?.event === "complete") ||
        (data?.ns === "anipm.player" && data?.event === "ended");

      if (isComplete && episode < episodeCount) {
        setEpisode(e => Math.min(e + 1, episodeCount));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [episode, episodeCount]);

  /* اختصار للسلسلة بالحلقات */
  const selectEpisode = (n: number) => setEpisode(n);

  const prevLabel = `← ${t.anime.previous}`;
  const nextLabel = `${t.anime.next} →`;

  const arabicAvailable = !!arabicId && !!arabicEpisodes && arabicEpisodes.length > 0;
  const embedLabel = canUseAniPm ? t.anime.providerAnipm : t.anime.providerFallback;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-h-[94vh] flex-col overflow-hidden rounded-t-2xl bg-zinc-950
          ring-1 ring-white/10 md:max-w-6xl md:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── شريط علوي: العنوان + الإغلاق/المفضلة ── */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-3 md:px-5">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-violet-400">{t.media.anime}</span>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-extrabold text-white md:text-xl">{details.title}</h1>
              <span className="flex-shrink-0 text-sm font-bold text-violet-400">· {t.player.episodeShort}{episode}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <FavBtn active={isFav} onToggle={() => toggleFav(item)} size={40} />
            <button onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-300
                transition hover:bg-white hover:text-black">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── جسم قابل للتمرير ── */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">

          {/* المشغّل أعلى الصفحة */}
          <div className="px-3 pt-3 md:px-5 md:pt-5">
            {/* Source toggle: العربية (مباشر <video>) vs embed */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 rounded-full bg-zinc-900 p-1 ring-1 ring-white/10">
                <button
                  onClick={() => setSource("arabic")}
                  disabled={!arabicAvailable && arabicReady}
                  title={!arabicReady ? (locale === "en" ? "Checking…" : "جاري التحقّق…") : !arabicAvailable ? (locale === "en" ? "No Arabic source" : "لا يوجد مصدر عربي") : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${source === "arabic" ? "bg-white text-black shadow" : arabicAvailable ? "text-zinc-300 hover:text-white" : "text-zinc-600 cursor-not-allowed"} ${!arabicReady && source !== "arabic" ? "opacity-60" : ""}`}
                >
                  {locale === "en" ? "Arabic (direct)" : "العربية — مباشر"}
                  {!arabicReady && <span className="ms-1 text-[10px] font-normal text-zinc-500">…</span>}
                </button>
                <button
                  onClick={() => setSource("embed")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${source === "embed" ? "bg-white text-black shadow" : "text-zinc-300 hover:text-white"}`}
                >
                  {embedLabel}
                </button>
              </div>
              <span className="text-[11px] text-zinc-500">
                {source === "arabic"
                  ? (arabicAvailable ? (locale === "en" ? "Hard-sub Arabic · <video>" : "مترجم عربي (حرق) · مشغّل مباشر") : (locale === "en" ? "Searching Arabic source…" : "جاري البحث عن المصدر العربي…"))
                  : (canUseAniPm ? `ani.pm · ${episodeCount} eps` : `Fallback · ${episodeCount} eps`)}
              </span>
            </div>

            {/* Provider badge + fallback toggle (only for embed source) */}
            {source === "embed" && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-bold ring-1 ring-white/10">
                  <span className={`h-2 w-2 rounded-full ${canUseAniPm ? "bg-violet-400" : "bg-zinc-500"}`} />
                  <span className={canUseAniPm ? "text-violet-300" : "text-zinc-400"}>
                    {canUseAniPm ? t.anime.providerAnipm : t.anime.providerFallback}
                  </span>
                  {!aniPmReady && <span className="text-zinc-500">· {t.anime.checkingProvider}</span>}
                  {canUseAniPm && aniPmEpAvail && !aniPmEpAvail[lang] && (
                    <span className="text-amber-300">· {t.anime.fallbackNotice}</span>
                  )}
                </span>

                {aniPmEpisodes && aniPmEpisodes.length > 0 && (
                  <button
                    onClick={() => setForceFallback(v => !v)}
                    className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-[11px] font-bold text-zinc-300
                      hover:border-white/20 hover:text-white transition"
                  >
                    {forceFallback ? t.anime.switchToAnipm : t.anime.switchToFallback}
                  </button>
                )}
              </div>
            )}

            {source === "arabic" ? (
              arabicLoading ? (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black ring-1 ring-white/10">
                  <Loader2 className="animate-spin text-violet-400" size={28} />
                </div>
              ) : arabicAvailable && arabicId ? (
                <ArabicPlayer
                  arabicId={arabicId}
                  episode={episode}
                  animeType="SERIES"
                  title={details.title}
                  onEnded={() => { if (episode < episodeCount) setEpisode(e => e + 1); }}
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950 p-6 text-center ring-1 ring-white/10">
                  <p className="text-sm font-bold text-zinc-300">{locale === "en" ? "No Arabic source for this title" : "لا يوجد مصدر عربي لهذا الأنيمي"}</p>
                  <p className="text-xs text-zinc-500">{locale === "en" ? "Switch to the other player above." : "استخدم المشغّل الآخر من الأعلى."}</p>
                  <button onClick={() => setSource("embed")} className="mt-1 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-zinc-200">
                    {locale === "en" ? "Use fallback player" : "استخدام المشغّل البديل"}
                  </button>
                </div>
              )
            ) : (
              <>
                <EmbedPlayer
                  src={url}
                  title={`${details.title} — ${t.player.episodeShort}${episode}`}
                  reloadKey={`${reloadKey}-${canUseAniPm ? "anipm" : "mega"}-${lang}-${episode}`}
                  accent="violet"
                  blockPopups={false}
                  aspect
                />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[11px] font-semibold text-zinc-500 hover:text-violet-400 transition"
                >
                  {t.anime.openPlayer}
                </a>
              </>
            )}
          </div>

          {/* عمودان: التفاصيل / الحلقات — الترتيب يتبع اتجاه الواجهة */}
          <div className="grid gap-5 p-3 md:gap-6 md:p-5 lg:grid-cols-[1fr_340px]">

            {/* ── العمود الأول: التفاصيل ── */}
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                {details.score && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1
                    font-bold text-amber-300 ring-1 ring-white/10 backdrop-blur">
                    ⭐ {details.score}
                  </span>
                )}
                {details.year && <span className="font-bold text-zinc-300">{details.year}</span>}
                {details.status && <span className="text-zinc-500">· {details.status}</span>}
                <span className="text-zinc-500">· {t.anime.episodesCount(episodeCount)}</span>
                {genres && <span className="text-zinc-500">· {genres}</span>}
              </div>

              {/* اختيار اللغة — مخفي عند استخدام المصدر العربي (hard-sub) */}
              {source === "embed" && langs.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {langs.map(l => (
                    <button key={l.id} onClick={() => setLang(l.id)}
                      className={`rounded-lg border px-4 py-1.5 text-[12px] font-bold transition
                        ${lang === l.id
                          ? "border-white bg-white text-black"
                          : "border-white/10 bg-[#15151a] text-zinc-300 hover:border-white/40 hover:text-white"}`}>
                      {l.name[locale]}
                    </button>
                  ))}
                </div>
              )}
              {source === "arabic" && (
                <p className="text-xs text-zinc-500">
                  {locale === "en" ? "Arabic subtitles are burned into the video (hard-sub)." : "الترجمة العربية محروقة داخل الفيديو — لا حاجة لاختيار لغة."}
                </p>
              )}

              {/* التنقل بين الحلقات */}
              <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <button
                  disabled={episode <= 1}
                  onClick={() => setEpisode(e => e - 1)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300
                    disabled:opacity-30 hover:text-violet-400 transition">
                  {prevLabel}
                </button>
                <span className="text-xs text-zinc-400">{t.anime.episode} {episode} / {episodeCount}</span>
                <button
                  disabled={episode >= episodeCount}
                  onClick={() => setEpisode(e => e + 1)}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black
                    disabled:opacity-30 hover:bg-zinc-200 transition">
                  {nextLabel}
                </button>
              </div>

              {/* القصة */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-300">{t.anime.story}</h3>
                <p dir="auto" className="text-sm leading-7 text-zinc-300 line-clamp-6">
                  {details.description || t.anime.noDescription}
                </p>
              </div>

              {/* قائمة الحلقات (موبايل) */}
              <div className="lg:hidden">
                <h3 className="mb-3 text-sm font-bold text-zinc-300">{t.anime.episodes}</h3>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl ring-1 ring-white/10
                  [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">
                  {loadingEps && source === "embed" ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-violet-400" />
                    </div>
                  ) : arabicLoading && source === "arabic" ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-violet-400" />
                    </div>
                  ) : (
                    episodeList.map(ep => (
                      <button key={ep.number}
                        onClick={() => selectEpisode(ep.number)}
                        className={`flex w-full items-center gap-3 border-b border-white/5
                          px-3 py-2.5 text-right transition hover:bg-white/5 last:border-0
                          ${episode === ep.number ? "bg-white/5 border-s-2 border-s-white" : ""}`}>
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                          rounded-lg text-xs font-extrabold
                          ${episode === ep.number
                            ? "bg-white text-black"
                            : "bg-[#1c1c22] text-zinc-300 ring-1 ring-white/10"}`}>
                          {ep.number}
                        </span>
                        <p dir="auto" className="line-clamp-1 flex-1 min-w-0 text-[12px] font-semibold text-white">
                          {ep.title || `${t.anime.episode} ${ep.number}`}
                        </p>
                        <Play size={12} className="flex-shrink-0 text-zinc-500" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── العمود الثاني: قائمة الحلقات (سطح المكتب) ── */}
            <aside className="hidden lg:block">
              <h3 className="mb-3 text-sm font-bold text-zinc-300">{t.anime.episodes}</h3>
              <div className="flex max-h-[60vh] flex-col overflow-y-auto rounded-xl ring-1 ring-white/10
                [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">
                {loadingEps && source === "embed" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-violet-400" />
                  </div>
                ) : arabicLoading && source === "arabic" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-violet-400" />
                  </div>
                ) : episodeList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-zinc-500">{t.anime.noEpisodes}</p>
                ) : (
                  episodeList.map(ep => (
                    <button key={ep.number}
                      onClick={() => selectEpisode(ep.number)}
                      className={`flex w-full items-center gap-3 border-b border-white/5
                        px-3 py-2.5 text-right transition hover:bg-white/5 last:border-0
                        ${episode === ep.number ? "bg-white/5 border-s-2 border-s-white" : ""}`}>
                      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                        rounded-lg text-xs font-extrabold
                        ${episode === ep.number
                          ? "bg-white text-black"
                          : "bg-[#1c1c22] text-zinc-300 ring-1 ring-white/10"}`}>
                        {ep.number}
                      </span>
                      <p dir="auto" className="line-clamp-1 flex-1 min-w-0 text-[12px] font-semibold text-white">
                        {ep.title || `${t.anime.episode} ${ep.number}`}
                      </p>
                      <Play size={12} className="flex-shrink-0 text-zinc-500" />
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
