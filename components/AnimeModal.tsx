"use client";
import { useEffect, useState } from "react";
import { Loader2, Play, X, ArrowRight } from "lucide-react";
import {
  AnimeItem, AnimeEpisode, AnimeLang,
  ANIME_LANGS, buildAnimeEmbedUrl, buildEpisodeList,
  fetchAnimeByMal, fetchAnimeSeries,
} from "@/lib/anime";
import { FavBtn } from "./ui";
import { EmbedPlayer } from "./EmbedPlayer";

function AnimeVideoPlayer({
  item, episode, episodes, episodeCount,
}: {
  item: AnimeItem;
  episode: number;
  episodes: AnimeEpisode[];
  episodeCount: number;
}) {
  const [lang, setLang] = useState<AnimeLang>("sub");
  const [reloadKey, setReloadKey] = useState(0);

  const epData = episodes.find(e => e.number === episode);
  const embedId = epData?.embed_id;
  const url = buildAnimeEmbedUrl(item.mal_id, episode, lang, embedId);

  const langs = ANIME_LANGS.filter(l => {
    if (l.id === "dub" && item.is_dub === 0) return false;
    if (epData?.has_sub === false && l.id === "sub") return false;
    if (epData?.has_dub === false && l.id === "dub") return false;
    return true;
  });

  useEffect(() => {
    setReloadKey(k => k + 1);
  }, [lang, episode, embedId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.includes("megaplay.buzz")) return;
      let data = event.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (data?.event === "complete" && episode < episodeCount) {
        window.dispatchEvent(new CustomEvent("anime-next-ep"));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [episode, episodeCount]);

  return (
    <div className="space-y-3">
      <EmbedPlayer
        src={url}
        title={`${item.title} — ح${episode}`}
        reloadKey={`${reloadKey}-${lang}-${episode}`}
        accent="violet"
      />

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-[11px] font-semibold text-zinc-500 hover:text-violet-400 transition"
      >
        فتح المشغّل في نافذة جديدة إذا لم يستجب
      </a>

      <div className="flex gap-2">
        {langs.map(l => (
          <button key={l.id} onClick={() => setLang(l.id)}
            className={`rounded-lg border px-4 py-1.5 text-[12px] font-bold transition
              ${lang === l.id
                ? "bg-white border-white text-black"
                : "bg-[#15151a] border-white/10 text-zinc-300 hover:border-white/40 hover:text-white"}`}>
            {l.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnimeModal({
  item, onClose, favSet, toggleFav,
}: {
  item: AnimeItem;
  onClose: () => void;
  favSet: Set<string>;
  toggleFav: (item: AnimeItem) => void;
}) {
  const [details, setDetails]       = useState<AnimeItem>(item);
  const [episodes, setEpisodes]     = useState<AnimeEpisode[]>([]);
  const [episode, setEpisode]       = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loadingEps, setLoadingEps] = useState(true);

  const isFav = favSet.has(`anime-${item.mal_id}`);
  const episodeCount = details.episodes || episodes.length || 12;
  const episodeList = buildEpisodeList(episodeCount, episodes);
  const genres = (details.genres || []).join(" · ");

  useEffect(() => {
    let alive = true;
    setLoadingEps(true);

    (async () => {
      const [series, malInfo] = await Promise.all([
        fetchAnimeSeries(item.id),
        fetchAnimeByMal(item.mal_id),
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
  }, [item.id, item.mal_id]);

  useEffect(() => {
    const next = () => setEpisode(e => Math.min(e + 1, episodeCount));
    window.addEventListener("anime-next-ep", next);
    return () => window.removeEventListener("anime-next-ep", next);
  }, [episodeCount]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative w-full md:max-w-4xl max-h-[94vh] rounded-t-2xl md:rounded-2xl bg-zinc-950 ring-1 ring-white/10
          [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1
          ${showPlayer ? "overflow-hidden" : "overflow-y-auto"}`}
        onClick={e => e.stopPropagation()}
      >
        {!showPlayer ? (
          <>
            <div className="relative h-44 md:h-56 w-full overflow-hidden flex-shrink-0 bg-violet-950/30">
              {details.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={details.poster} alt=""
                  className="h-full w-full object-cover opacity-40 blur-sm scale-110" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <button onClick={onClose}
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center
                  rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition">
                <X size={18} />
              </button>
              <button onClick={() => setShowPlayer(true)}
                className="absolute inset-0 flex items-center justify-center group">
                <span className="flex h-16 w-16 items-center justify-center rounded-full
                  bg-white/95 text-black shadow-2xl shadow-black/50
                  group-hover:scale-110 transition-transform">
                  <Play size={26} className="fill-black" />
                </span>
              </button>
            </div>

            <div className="px-5 md:px-8 pb-8 -mt-10 relative">
              <div className="flex items-end gap-4">
                {details.poster && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={details.poster} alt=""
                    className="w-24 md:w-28 rounded-xl shadow-xl ring-1 ring-white/10 flex-shrink-0" />
                )}
                <div className="flex-1 pb-1">
                  <span className="text-[10px] font-bold text-violet-400">أنيمي</span>
                  <h1 className="text-xl md:text-2xl font-extrabold text-white">{details.title}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    {details.score && <span>⭐ {details.score}</span>}
                    {details.year && <span>{details.year}</span>}
                    {details.status && <span className="text-zinc-500">· {details.status}</span>}
                    {genres && <span className="text-zinc-500">· {genres}</span>}
                  </div>
                </div>
                <FavBtn active={isFav} onToggle={() => toggleFav(item)} size={40} />
              </div>

              <p className="mt-5 text-sm leading-7 text-zinc-300 line-clamp-6">
                {details.description || "لا يوجد وصف متوفر."}
              </p>

              <button
                onClick={() => setShowPlayer(true)}
                className="mt-5 flex items-center gap-2 rounded-full bg-white px-7 py-3
                  text-sm font-extrabold text-black shadow-xl shadow-black/40
                  hover:bg-zinc-200 transition"
              >
                <Play size={16} className="fill-black" />
                مشاهدة الحلقة 1
              </button>

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-zinc-300">الحلقات</h3>
                <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-white/10
                  [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">
                  {loadingEps ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-violet-400" />
                    </div>
                  ) : (
                    episodeList.map(ep => (
                      <button key={ep.number}
                        onClick={() => { setEpisode(ep.number); setShowPlayer(true); }}
                        className={`flex w-full items-center gap-3 border-b border-white/5
                          px-3 py-2.5 text-right transition hover:bg-white/5
                          ${episode === ep.number ? "bg-white/5 border-r-2 border-r-white" : ""}`}>
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                          rounded-lg text-xs font-extrabold
                          ${episode === ep.number
                            ? "bg-white text-black"
                            : "bg-[#1c1c22] text-zinc-300 ring-1 ring-white/10"}`}>
                          {ep.number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="line-clamp-1 text-[12px] font-semibold text-white">
                            {ep.title || `الحلقة ${ep.number}`}
                          </p>
                        </div>
                        <Play size={12} className="text-zinc-500 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setShowPlayer(false)}
                className="flex items-center gap-1.5 text-sm font-bold text-zinc-300 hover:text-violet-400 transition">
                <ArrowRight size={16} /> رجوع
              </button>
              <span className="text-sm font-bold text-white line-clamp-1">
                {details.title}
                <span className="text-violet-400 mr-1">· ح{episode}</span>
              </span>
              <button onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full
                  bg-zinc-900 text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <AnimeVideoPlayer
              item={details}
              episode={episode}
              episodes={episodes}
              episodeCount={episodeCount}
            />

            <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
              <button
                disabled={episode <= 1}
                onClick={() => setEpisode(e => e - 1)}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300
                  disabled:opacity-30 hover:text-violet-400 transition">
                ← السابقة
              </button>
              <span className="text-xs text-zinc-400">الحلقة {episode} / {episodeCount}</span>
              <button
                disabled={episode >= episodeCount}
                onClick={() => setEpisode(e => e + 1)}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black
                  disabled:opacity-30 hover:bg-zinc-200 transition">
                التالية →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
