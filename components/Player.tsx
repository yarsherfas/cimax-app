"use client";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, Play, X, ArrowRight, Share2, User,
  BookOpen, Users, Clapperboard, ListVideo, Film, Lock,
} from "lucide-react";
import {
  BACKDROP, IMG, IMG_LG, PROFILE, GENRES_MOVIE, GENRES_TV,
  MediaItem, MediaType, Episode, CastMember,
  SERVERS, buildEmbedUrl, tmdb,
} from "@/lib/tmdb";
import { FavBtn, PosterCard, Rating } from "./ui";
import { EmbedPlayer } from "./EmbedPlayer";

export function VideoPlayer({
  item, type, season, episode,
}: {
  item: MediaItem; type: MediaType; season: number; episode: number;
}) {
  const [server, setServer] = useState(SERVERS[0].id);
  const [reloadKey, setReloadKey] = useState(0);
  const [unprotected, setUnprotected] = useState<Set<string>>(() => new Set());

  /* تذكّر آخر سيرفر اختاره المستخدم + السيرفرات المُوقفة حمايتها */
  useEffect(() => {
    const saved = localStorage.getItem("cimax-server");
    if (saved && SERVERS.some(s => s.id === saved && !s.locked)) setServer(saved);
    try {
      const off = JSON.parse(localStorage.getItem("cimax-unprotected") || "[]");
      if (Array.isArray(off)) setUnprotected(new Set(off));
    } catch {}
  }, []);

  const pickServer = (id: string) => {
    setServer(id);
    try { localStorage.setItem("cimax-server", id); } catch {}
  };

  /* بعض المزوّدين يرفضون العمل داخل iframe مقيّد (Sandbox Not Allowed)
     فيتيح هذا الزر إيقاف الحماية لهذا السيرفر وإعادة تحميل المشغّل */
  const toggleProtection = () => {
    setUnprotected(prev => {
      const next = new Set(prev);
      if (next.has(server)) next.delete(server); else next.add(server);
      try { localStorage.setItem("cimax-unprotected", JSON.stringify([...next])); } catch {}
      return next;
    });
    setReloadKey(k => k + 1);
  };

  const url = buildEmbedUrl(server, type, item.id, season, episode);
  const serverMeta = SERVERS.find(s => s.id === server);
  const serverName = serverMeta?.name;
  const blockPopups = serverMeta?.blockPopups !== false && !unprotected.has(server);

  useEffect(() => {
    setReloadKey(k => k + 1);
  }, [server, season, episode]);

  return (
    <div className="space-y-3">
      <EmbedPlayer
        src={url}
        title={`${serverName} — ${item.title || item.name || "مشغّل"}`}
        reloadKey={`${reloadKey}-${server}-${season}-${episode}`}
        accent="blue"
        blockPopups={blockPopups}
      />

      {/* حالة الحماية + مفتاح التبديل */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2">
        <p className="text-[11px] leading-5 text-zinc-400">
          {blockPopups ? (
            <>🛡 <strong className="text-emerald-400">الحماية مفعّلة</strong> — لن تُفتح أي
            تبويبات إعلانية. إن ظهر داخل المشغّل خطأ <span dir="ltr" className="text-zinc-500">Sandbox
            Not Allowed</span> فالمزوّد يرفض الحماية.</>
          ) : (
            <>⚠️ <strong className="text-amber-400">الحماية متوقفة</strong> — قد تُفتح تبويبات
            إعلانية عند النقر داخل المشغّل.</>
          )}
        </p>
        {serverMeta?.blockPopups !== false && (
          <button
            onClick={toggleProtection}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition
              ${blockPopups
                ? "bg-zinc-800 text-zinc-300 hover:bg-amber-500/20 hover:text-amber-300"
                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"}`}
          >
            {blockPopups ? "إيقاف الحماية وإعادة المحاولة" : "تشغيل الحماية"}
          </button>
        )}
      </div>

      {server === "vidking" && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-[11px] font-semibold text-zinc-500 hover:text-blue-400 transition"
        >
          فتح VidKing في نافذة جديدة إذا لم يستجب المشغّل
        </a>
      )}

      {/* servers row */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-zinc-500">
          {SERVERS.filter(s => !s.locked).length} سيرفرات متاحة — الباقي مقفل حالياً 🔒
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1
          [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
          {SERVERS.map(s => s.locked ? (
            /* سيرفر مقفل — خلفية سوداء وقفل متحرك، غير قابل للاختيار */
            <button key={s.id} disabled title="سيرفر مقفل"
              className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full
                border border-white/10 bg-black px-3.5 py-1.5 text-[12px] font-bold text-zinc-600">
              <Lock size={11} className="lock-jiggle text-zinc-500" />
              {s.name}
            </button>
          ) : (
            <button key={s.id} onClick={() => pickServer(s.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition
                ${server === s.id
                  ? "bg-white border-white text-black"
                  : "bg-[#15151a] border-white/10 text-zinc-300 hover:border-white/40 hover:text-white"}`}>
              {s.ar && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px]
                  bg-emerald-500/20 ring-1 ring-emerald-400/50 text-[8px] font-extrabold text-emerald-400">
                  AR
                </span>
              )}
              {s.blockPopups !== false && !unprotected.has(s.id) && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px]
                  bg-sky-500/20 ring-1 ring-sky-400/50 text-[8px] font-extrabold text-sky-400"
                  title="حظر الإعلانات المنبثقة">
                  🛡
                </span>
              )}
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── شارة معلومات صغيرة (سنة · مدة · HD …) ── */
function MetaBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1
      text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
      {children}
    </span>
  );
}

/* ── عنوان قسم موحّد (يتماشى مع صفوف الصفحة الرئيسية) ── */
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white md:text-base">
      <span className="text-zinc-500">{icon}</span>
      {children}
    </h3>
  );
}

/* ═══════════════════════════════════════
   نافذة التفاصيل الكاملة — تصميم صفحة العمل
═══════════════════════════════════════ */
export function DetailsModal({
  item, type, onClose, onSelect, favSet, toggleFav,
}: {
  item: MediaItem; type: MediaType;
  onClose: () => void;
  onSelect?: (item: MediaItem, type: MediaType) => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [mode, setMode] = useState<"info" | "player" | "trailer">("info");
  const [season, setSeason]         = useState(1);
  const [episode, setEpisode]       = useState(1);
  const [seasonEps, setSeasonEps]   = useState<Episode[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [copied, setCopied]         = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* جلب التفاصيل + الممثلين + المشابه + الإعلان في طلب واحد */
  useEffect(() => {
    let alive = true;
    setDetails(null);
    tmdb(`/${type}/${item.id}`, { append_to_response: "credits,recommendations,similar,videos" })
      .then(d => { if (alive) setDetails(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.id, type]);

  /* تصفير الواجهة عند فتح عمل آخر من «أعمال مشابهة» */
  useEffect(() => {
    setMode("info");
    setSeason(1);
    setEpisode(1);
    setSeasonEps([]);
  }, [item.id, type]);

  /* العودة لأعلى النافذة عند تبديل الوضع */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [mode]);

  /* جلب حلقات الموسم */
  useEffect(() => {
    if (type !== "tv" || !details) return;
    setLoadingEps(true);
    tmdb(`/tv/${item.id}/season/${season}`)
      .then(d => setSeasonEps(d.episodes || []))
      .catch(() => setSeasonEps([]))
      .finally(() => setLoadingEps(false));
  }, [type, item.id, season, details]);

  const title    = item.title || item.name || details?.title || details?.name || "بلا عنوان";
  const year     = (item.release_date || item.first_air_date
    || details?.release_date || details?.first_air_date || "").slice(0, 4);
  const rating   = details?.vote_average ?? item.vote_average;
  const genreMap = type === "tv" ? GENRES_TV : GENRES_MOVIE;
  const genres: string[] = details?.genres?.map((g: any) => g.name)
    || (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean);
  const isFav   = favSet.has(`${type}-${item.id}`);
  const seasons = details?.number_of_seasons || 1;

  /* الممثلون (من لديهم صور، أول 20) */
  const cast: CastMember[] = (details?.credits?.cast || [])
    .filter((c: CastMember) => c.profile_path)
    .slice(0, 20);

  /* الإعلان الرسمي من يوتيوب إن وُجد */
  const videos = details?.videos?.results || [];
  const trailer = videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official)
    || videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer")
    || videos.find((v: any) => v.site === "YouTube" && v.type === "Teaser");

  /* أعمال مشابهة = التوصيات + المشابه، بلا تكرار */
  const similar: MediaItem[] = (() => {
    const seen = new Set<number>([item.id]);
    const out: MediaItem[] = [];
    for (const r of [...(details?.recommendations?.results || []), ...(details?.similar?.results || [])]) {
      if (!r.poster_path || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
      if (out.length >= 14) break;
    }
    return out;
  })();

  /* مشاركة الصفحة */
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className={`relative w-full md:max-w-5xl max-h-[94vh] rounded-t-2xl md:rounded-2xl bg-zinc-950 ring-1 ring-white/10
          [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1
          ${mode !== "info" ? "overflow-hidden" : "overflow-y-auto"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* ═══════════ وضع التفاصيل ═══════════ */}
        {mode === "info" ? (
          <>
            {/* ── البانر ── */}
            <div className="relative h-56 w-full flex-shrink-0 overflow-hidden md:h-[22rem]">
              {item.backdrop_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${BACKDROP}${item.backdrop_path}`} alt=""
                  className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[#1c1c22]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/35 to-black/25" />
              {/* زر الإغلاق */}
              <button onClick={onClose}
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center
                  rounded-full bg-black/60 text-white transition hover:bg-white hover:text-black">
                <X size={18} />
              </button>
              {/* زر التشغيل على البانر */}
              <button onClick={() => setMode("player")}
                className="group absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full
                  bg-amber-400 text-black shadow-2xl shadow-black/50 ring-4 ring-white/15
                  transition-transform group-hover:scale-110">
                  <Play size={22} className="fill-black" />
                </span>
              </button>
            </div>

            {/* ── المحتوى ── */}
            <div className="relative px-5 pb-8 md:px-8">

              {/* الملصق + العنوان + المعلومات */}
              <div className="-mt-16 flex items-end gap-4 md:-mt-24">
                {item.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${IMG}${item.poster_path}`} alt=""
                    className="w-24 flex-shrink-0 rounded-xl shadow-2xl shadow-black/60
                      ring-1 ring-white/15 md:w-36" />
                ) : (
                  <div className="flex w-24 flex-shrink-0 items-center justify-center rounded-xl
                    bg-[#1c1c22] text-zinc-600 ring-1 ring-white/10 md:h-52 md:w-36">
                    <Film size={30} />
                  </div>
                )}
                <div className="min-w-0 flex-1 pb-1">
                  <h1 className="text-xl font-black leading-tight text-white md:text-3xl">{title}</h1>
                  {details?.tagline && (
                    <p dir="auto" className="mt-1 line-clamp-1 text-[11px] text-zinc-500 md:text-xs">
                      {details.tagline}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <Rating value={rating} size="md" />
                    {year && <span className="font-bold text-zinc-300">{year}</span>}
                    <span className="text-zinc-600">·</span>
                    <span>{type === "tv" ? "مسلسل" : "فيلم"}</span>
                    {type === "movie" && !!details?.runtime && (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span>{details.runtime} دقيقة</span>
                      </>
                    )}
                    {type === "tv" && details && (
                      <>
                        <span className="text-zinc-600">·</span>
                        <span>{seasons} {seasons > 1 ? "مواسم" : "موسم"}</span>
                      </>
                    )}
                    <MetaBadge>HD</MetaBadge>
                  </div>
                </div>
              </div>

              {/* التصنيفات */}
              {!!genres.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {genres.map(g => (
                    <span key={g} className="rounded-full bg-white/5 px-3 py-1
                      text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setMode("player")}
                  className="flex items-center gap-2 rounded-full bg-amber-400 px-7 py-3
                    text-sm font-black text-black shadow-xl shadow-amber-400/20
                    transition hover:bg-amber-300">
                  <Play size={16} className="fill-black" />
                  تشغيل الآن
                </button>

                {trailer && (
                  <button onClick={() => setMode("trailer")}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3
                      text-sm font-bold text-white ring-1 ring-white/15 backdrop-blur
                      transition hover:bg-white/20">
                    <Clapperboard size={16} />
                    الإعلان
                  </button>
                )}

                <FavBtn active={isFav} onToggle={() => toggleFav(item, type)} size={46} />

                <button onClick={share} title="مشاركة"
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-full
                    bg-white/5 text-zinc-300 ring-1 ring-white/15 backdrop-blur
                    transition hover:bg-white/15 hover:text-white">
                  <Share2 size={18} />
                </button>
                {copied && (
                  <span className="text-[11px] font-bold text-emerald-400">تم نسخ الرابط ✓</span>
                )}
              </div>

              {/* القصة */}
              <section className="mt-7">
                <SectionTitle icon={<BookOpen size={16} />}>القصة</SectionTitle>
                <p dir="auto" className="text-[13px] leading-7 text-zinc-300">
                  {item.overview || details?.overview || "لا يوجد وصف متوفر لهذا العمل."}
                </p>
              </section>

              {/* طاقم العمل */}
              {!!cast.length && (
                <section className="mt-7">
                  <SectionTitle icon={<Users size={16} />}>طاقم العمل</SectionTitle>
                  <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2
                    [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1">
                    {cast.map(c => (
                      <div key={`cast-${c.id}`}
                        className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5 text-center md:w-20">
                        {c.profile_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`${PROFILE}${c.profile_path}`} alt={c.name} loading="lazy"
                            className="h-16 w-16 rounded-full object-cover ring-1 ring-white/15 md:h-20 md:w-20" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full
                            bg-[#1c1c22] text-zinc-600 ring-1 ring-white/10 md:h-20 md:w-20">
                            <User size={22} />
                          </div>
                        )}
                        <p className="line-clamp-1 w-full text-[11px] font-bold text-zinc-200">{c.name}</p>
                        {c.character && (
                          <p className="line-clamp-1 w-full text-[10px] text-zinc-500">{c.character}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* الحلقات (للمسلسلات) */}
              {type === "tv" && (
                <section className="mt-7">
                  <SectionTitle icon={<ListVideo size={16} />}>الحلقات</SectionTitle>

                  {/* المواسم */}
                  {seasons > 1 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1
                      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {Array.from({ length: seasons }, (_, i) => i + 1).map(s => (
                        <button key={s}
                          onClick={() => { setSeason(s); setEpisode(1); }}
                          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                            ${season === s
                              ? "bg-amber-400 text-black"
                              : "bg-[#1c1c22] text-zinc-300 ring-1 ring-white/10 hover:ring-white/40"}`}>
                          الموسم {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* قائمة الحلقات */}
                  <div className="max-h-[26rem] overflow-y-auto rounded-xl bg-[#101014]
                    ring-1 ring-white/10 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1">
                    {loadingEps ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-amber-400" />
                      </div>
                    ) : seasonEps.length === 0 ? (
                      <p className="py-10 text-center text-xs text-zinc-500">لا توجد حلقات</p>
                    ) : (
                      seasonEps.map(ep => {
                        const active = episode === ep.episode_number;
                        return (
                          <button key={ep.id}
                            onClick={() => { setEpisode(ep.episode_number); setMode("player"); }}
                            className={`group flex w-full items-start gap-3 border-b border-white/5
                              p-2.5 text-right transition last:border-0 hover:bg-white/5
                              ${active ? "bg-amber-400/5" : ""}`}>
                            {/* صورة الحلقة */}
                            <div className="relative w-24 flex-shrink-0 md:w-36">
                              <div className="aspect-video overflow-hidden rounded-lg bg-[#1c1c22]">
                                {ep.still_path ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={`${IMG_LG}${ep.still_path}`} alt="" loading="lazy"
                                    className="h-full w-full object-cover transition-transform
                                      duration-300 group-hover:scale-105" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-zinc-600">
                                    <Film size={18} />
                                  </div>
                                )}
                              </div>
                              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5
                                py-0.5 text-[9px] font-black text-white backdrop-blur">
                                {ep.episode_number}
                              </span>
                              <span className="absolute inset-0 flex items-center justify-center
                                rounded-lg bg-black/50 opacity-0 transition-opacity
                                group-hover:opacity-100">
                                <Play size={18} className="fill-white text-white" />
                              </span>
                            </div>
                            {/* نص الحلقة */}
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="line-clamp-1 text-[12px] font-bold text-white md:text-[13px]">
                                {ep.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-zinc-500">
                                {ep.air_date || "—"}{ep.runtime ? ` · ${ep.runtime} د` : ""}
                              </p>
                              {ep.overview && (
                                <p dir="auto" className="mt-1 hidden text-[11px] leading-5 text-zinc-400
                                  md:line-clamp-2">
                                  {ep.overview}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {/* أعمال مشابهة */}
              {!!similar.length && onSelect && (
                <section className="mt-7">
                  <SectionTitle icon={<Clapperboard size={16} />}>أعمال مشابهة</SectionTitle>
                  <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2
                    [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {similar.map(sim => (
                      <div key={`sim-${sim.id}`} className="w-[110px] flex-shrink-0 md:w-[130px]">
                        <PosterCard item={sim} type={type}
                          onSelect={onSelect} favSet={favSet} toggleFav={toggleFav} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : mode === "trailer" && trailer ? (
          /* ═══════════ وضع الإعلان ═══════════ */
          <div className="p-3 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setMode("info")}
                className="flex items-center gap-1.5 text-sm font-bold text-zinc-300 transition hover:text-amber-400">
                <ArrowRight size={16} /> رجوع
              </button>
              <span className="line-clamp-1 text-sm font-bold text-white">
                الإعلان الرسمي · {title}
              </span>
              <button onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full
                  bg-zinc-900 text-zinc-400 transition hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
              style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`}
                title={`إعلان ${title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        ) : (
          /* ═══════════ وضع المشغّل ═══════════ */
          <div className="p-3 md:p-5">
            {/* header */}
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setMode("info")}
                className="flex items-center gap-1.5 text-sm font-bold text-zinc-300 transition hover:text-amber-400">
                <ArrowRight size={16} /> رجوع
              </button>
              <span className="line-clamp-1 text-sm font-bold text-white">
                {title}
                {type === "tv" && (
                  <span className="mr-1 text-amber-400">· م{season} ح{episode}</span>
                )}
              </span>
              <button onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full
                  bg-zinc-900 text-zinc-400 transition hover:text-white">
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
                    transition hover:text-amber-400 disabled:opacity-30">
                  ← السابقة
                </button>
                <span className="text-xs text-zinc-400">
                  الموسم {season} · الحلقة {episode}
                </span>
                <button
                  disabled={!seasonEps.length || episode >= seasonEps.length}
                  onClick={() => setEpisode(e => e + 1)}
                  className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-black text-black
                    transition hover:bg-amber-300 disabled:opacity-30">
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
