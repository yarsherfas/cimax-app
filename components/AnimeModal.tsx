"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import {
  AnimeItem, AnimeEpisode, AnimeLang,
  ANIME_LANGS, buildAnimeEmbedUrl, buildEpisodeList,
  fetchAnimeByMal, fetchAnimeSeries,
} from "@/lib/anime";
import { FavBtn } from "./ui";
import { EmbedPlayer } from "./EmbedPlayer";
import { useLanguage } from "./LanguageProvider";

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

  const isFav = favSet.has(`anime-${item.mal_id}`);
  const episodeCount = details.episodes || episodes.length || 12;
  const episodeList = buildEpisodeList(episodeCount, episodes);
  const genres = (details.genres || []).join(" · ");

  const epData = episodes.find(e => e.number === episode);
  const embedId = epData?.embed_id;
  const url = buildAnimeEmbedUrl(item.mal_id, episode, lang, embedId);

  const langs = useMemo(
    () => ANIME_LANGS.filter(l => {
      if (l.id === "dub" && details.is_dub === 0) return false;
      if (epData?.has_sub === false && l.id === "sub") return false;
      if (epData?.has_dub === false && l.id === "dub") return false;
      return true;
    }),
    [details.is_dub, epData?.has_sub, epData?.has_dub],
  );

  /* تحميل تفاصيل المسلسل + الحلقات + بيانات MAL */
  useEffect(() => {
    let alive = true;
    setLoadingEps(true);

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
      if (malInfo.episodes) {
        setDetails(prev => ({ ...prev, ...malInfo, episodes: malInfo.episodes ?? prev.episodes }));
      }
      setLoadingEps(false);
    })();

    return () => { alive = false; };
  }, [item.id, item.mal_id, locale]);

  /* إعادة تحميل المشغّل عند تغيّر اللغة/الحلقة */
  useEffect(() => {
    setReloadKey(k => k + 1);
  }, [lang, episode, embedId]);

  /* إن أصبحت اللغة الحالية غير متاحة للحلقة، عُد إلى المترجمة */
  useEffect(() => {
    if (langs.length > 0 && !langs.some(l => l.id === lang)) setLang("sub");
  }, [langs, lang]);

  /* MegaPlay يُعلن انتهاء الحلقة عبر postMessage — انتقل للتالية تلقائياً */
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.includes("megaplay.buzz")) return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data?.event === "complete" && episode < episodeCount) {
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
            <EmbedPlayer
              src={url}
              title={`${details.title} — ${t.player.episodeShort}${episode}`}
              reloadKey={`${reloadKey}-${lang}-${episode}`}
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

              {/* اختيار اللغة */}
              {langs.length > 1 && (
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
                  {loadingEps ? (
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
                {loadingEps ? (
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
