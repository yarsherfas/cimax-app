"use client";
import { useEffect, useState } from "react";
import { Loader2, Play, X, ArrowRight } from "lucide-react";
import {
  BACKDROP, IMG, GENRES_MOVIE, GENRES_TV,
  MediaItem, MediaType, Episode,
  SERVERS, buildEmbedUrl, tmdb,
} from "@/lib/tmdb";
import { FavBtn, Rating } from "./ui";

/* ═══════════════════════════════════════
   مشغّل iframe مع أزرار السيرفرات
═══════════════════════════════════════ */
export function VideoPlayer({
  item, type, season, episode,
}: {
  item: MediaItem; type: MediaType; season: number; episode: number;
}) {
  const [server, setServer] = useState(SERVERS[0].id);
  const [iframeKey, setIframeKey]   = useState(0);
  const [loading, setLoading]       = useState(true);

  const url = buildEmbedUrl(server, type, item.id, season, episode);

  /* إعادة تحميل عند تغيير السيرفر أو الحلقة */
  useEffect(() => {
    setLoading(true);
    setIframeKey(k => k + 1);
  }, [server, season, episode]);

  return (
    <div className="space-y-3">
      {/* iframe */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <Loader2 className="animate-spin text-blue-400" size={32} />
            <span className="text-xs text-zinc-500">
              جاري تحميل المشغّل من {SERVERS.find(s => s.id === server)?.name}…
            </span>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={url}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* servers row */}
      <div className="flex flex-wrap gap-2">
        {SERVERS.map(s => (
          <button key={s.id} onClick={() => setServer(s.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition
              ${server === s.id
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-zinc-900 border-white/10 text-zinc-300 hover:border-blue-400/40"}`}>
            {s.ar && (
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px]
                bg-emerald-500/20 ring-1 ring-emerald-400/50 text-[8px] font-extrabold text-emerald-400">
                AR
              </span>
            )}
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   نافذة التفاصيل الكاملة
═══════════════════════════════════════ */
export function DetailsModal({
  item, type, onClose, favSet, toggleFav,
}: {
  item: MediaItem; type: MediaType;
  onClose: () => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const [details, setDetails]             = useState<any>(null);
  const [showPlayer, setShowPlayer]       = useState(false);
  const [season, setSeason]               = useState(1);
  const [episode, setEpisode]             = useState(1);
  const [seasonEps, setSeasonEps]         = useState<Episode[]>([]);
  const [loadingEps, setLoadingEps]       = useState(false);

  /* جلب تفاصيل العمل */
  useEffect(() => {
    let alive = true;
    tmdb(`/${type}/${item.id}`)
      .then(d => { if (alive) setDetails(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.id, type]);

  /* جلب حلقات الموسم */
  useEffect(() => {
    if (type !== "tv" || !details) return;
    setLoadingEps(true);
    tmdb(`/tv/${item.id}/season/${season}`)
      .then(d => setSeasonEps(d.episodes || []))
      .catch(() => setSeasonEps([]))
      .finally(() => setLoadingEps(false));
  }, [type, item.id, season, details]);

  const title   = item.title || item.name || "بلا عنوان";
  const date    = item.release_date || item.first_air_date;
  const genreMap = type === "tv" ? GENRES_TV : GENRES_MOVIE;
  const genres  = (
    details?.genres?.map((g: any) => g.name) ||
    (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean)
  ).join(" · ");
  const isFav   = favSet.has(`${type}-${item.id}`);
  const seasons = details?.number_of_seasons || 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full md:max-w-4xl max-h-[94vh] overflow-y-auto
          rounded-t-2xl md:rounded-2xl bg-zinc-950 ring-1 ring-white/10
          [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── وضع التفاصيل ─── */}
        {!showPlayer ? (
          <>
            {/* backdrop */}
            <div className="relative h-44 md:h-72 w-full overflow-hidden flex-shrink-0">
              {item.backdrop_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${BACKDROP}${item.backdrop_path}`} alt=""
                  className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              {/* زر الإغلاق */}
              <button onClick={onClose}
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center
                  rounded-full bg-black/60 text-white hover:bg-blue-500 transition">
                <X size={18} />
              </button>
              {/* زر التشغيل الكبير */}
              <button onClick={() => setShowPlayer(true)}
                className="absolute inset-0 flex items-center justify-center group">
                <span className="flex h-16 w-16 items-center justify-center rounded-full
                  bg-blue-500/90 text-white shadow-2xl shadow-blue-500/40
                  group-hover:scale-110 transition-transform">
                  <Play size={26} className="fill-white" />
                </span>
              </button>
            </div>

            {/* body */}
            <div className="px-5 md:px-8 pb-8 -mt-12 relative">
              {/* poster + title */}
              <div className="flex items-end gap-4">
                {item.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${IMG}${item.poster_path}`} alt=""
                    className="w-24 md:w-32 rounded-xl shadow-xl ring-1 ring-white/10 flex-shrink-0" />
                )}
                <div className="flex-1 pb-1">
                  <h1 className="text-xl md:text-2xl font-extrabold text-white">{title}</h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <Rating value={item.vote_average} size="md" />
                    {date && <span>{date.slice(0, 4)}</span>}
                    {genres && <span className="text-zinc-500">· {genres}</span>}
                    {details?.runtime && <span>{details.runtime} دقيقة</span>}
                  </div>
                </div>
                <FavBtn active={isFav} onToggle={() => toggleFav(item, type)} size={40} />
              </div>

              {/* overview */}
              <p className="mt-5 text-sm leading-7 text-zinc-300">
                {item.overview || "لا يوجد وصف متوفر لهذا العمل."}
              </p>

              {/* watch btn */}
              <button
                onClick={() => setShowPlayer(true)}
                className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-l
                  from-blue-600 to-blue-500 px-6 py-3 text-sm font-extrabold text-white
                  shadow-lg shadow-blue-500/30 hover:brightness-110 transition"
              >
                <Play size={16} className="fill-white" />
                مشاهدة {type === "tv" ? "الحلقة الأولى" : "الفيلم"}
              </button>

              {/* ── TV controls ── */}
              {type === "tv" && (
                <div className="mt-6 space-y-3">
                  {/* seasons */}
                  <h3 className="text-sm font-bold text-zinc-300">المواسم</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1
                    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {Array.from({ length: seasons }, (_, i) => i + 1).map(s => (
                      <button key={s}
                        onClick={() => { setSeason(s); setEpisode(1); }}
                        className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                          ${season === s
                            ? "bg-gradient-to-l from-blue-600 to-blue-500 text-white"
                            : "bg-zinc-900 text-zinc-300 ring-1 ring-white/10 hover:ring-blue-400/40"}`}>
                        الموسم {s}
                      </button>
                    ))}
                  </div>

                  {/* episodes list */}
                  <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-white/10
                    [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">
                    {loadingEps ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-blue-400" />
                      </div>
                    ) : seasonEps.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-500">لا توجد حلقات</p>
                    ) : (
                      seasonEps.map(ep => (
                        <button key={ep.id}
                          onClick={() => { setEpisode(ep.episode_number); setShowPlayer(true); }}
                          className={`flex w-full items-center gap-3 border-b border-white/5
                            px-3 py-2.5 text-right transition hover:bg-blue-500/10
                            ${episode === ep.episode_number ? "bg-blue-500/10 border-r-2 border-r-blue-500" : ""}`}>
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center
                            rounded-lg text-xs font-extrabold
                            ${episode === ep.episode_number
                              ? "bg-blue-500 text-white"
                              : "bg-zinc-900 text-blue-300 ring-1 ring-white/10"}`}>
                            {ep.episode_number}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-1 text-[12px] font-semibold text-white">{ep.name}</p>
                            <p className="text-[10px] text-zinc-500">{ep.air_date || "—"}</p>
                          </div>
                          <Play size={12} className="text-zinc-500 flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ─── وضع المشغّل ─── */
          <div className="p-3 md:p-5">
            {/* header */}
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setShowPlayer(false)}
                className="flex items-center gap-1.5 text-sm font-bold text-zinc-300 hover:text-blue-400 transition">
                <ArrowRight size={16} /> رجوع
              </button>
              <span className="text-sm font-bold text-white line-clamp-1">
                {title}
                {type === "tv" && (
                  <span className="text-blue-400 mr-1">· م{season} ح{episode}</span>
                )}
              </span>
              <button onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full
                  bg-zinc-900 text-zinc-400 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <VideoPlayer item={item} type={type} season={season} episode={episode} />

            {/* TV ep nav */}
            {type === "tv" && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-900 px-4 py-3">
                <button
                  disabled={episode <= 1}
                  onClick={() => setEpisode(e => e - 1)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300
                    disabled:opacity-30 hover:text-blue-400 transition">
                  ← السابقة
                </button>
                <span className="text-xs text-zinc-400">
                  الموسم {season} · الحلقة {episode}
                </span>
                <button
                  disabled={!seasonEps.length || episode >= seasonEps.length}
                  onClick={() => setEpisode(e => e + 1)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white
                    disabled:opacity-30 hover:brightness-110 transition">
                  التالية →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
