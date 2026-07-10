"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, Star, Film, Tv, Loader2, Bookmark,
  ChevronLeft, Flame, X, Home, LayoutGrid,
} from "lucide-react";
import { GENRES_MOVIE, GENRES_TV, MediaItem, MediaType, tmdb } from "@/lib/tmdb";
import { PosterCard, SkeletonCard } from "@/components/ui";
import { HeroCarousel } from "@/components/Hero";
import { Row, TrendingRow } from "@/components/Row";
import { DetailsModal } from "@/components/Player";

type Page = "home" | "categories" | "favorites";

export default function CimaxPage() {
  /* ── بيانات الرئيسية ── */
  const [heroSlides,    setHeroSlides]    = useState<MediaItem[]>([]);
  const [trending,      setTrending]      = useState<MediaItem[]>([]);
  const [nowPlaying,    setNowPlaying]    = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [onTheAir,      setOnTheAir]      = useState<MediaItem[]>([]);
  const [topRated,      setTopRated]      = useState<MediaItem[]>([]);
  const [popularTV,     setPopularTV]     = useState<MediaItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  /* ── بحث ── */
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<MediaItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  /* ── واجهة ── */
  const [selected, setSelected] = useState<{ item: MediaItem; type: MediaType } | null>(null);
  const [page,     setPage]     = useState<Page>("home");

  /* ── مفضلة ── */
  const [favorites, setFavorites] = useState<Map<string, MediaItem>>(new Map());
  const favSet  = new Set(favorites.keys());
  const favList = Array.from(favorites.values());

  const toggleFav = useCallback((item: MediaItem, type: MediaType) => {
    setFavorites(prev => {
      const next = new Map(prev);
      const key = `${type}-${item.id}`;
      next.has(key) ? next.delete(key) : next.set(key, { ...item, media_type: type });
      return next;
    });
  }, []);

  /* ── فئات ── */
  const [catType,    setCatType]    = useState<MediaType>("movie");
  const [catGenre,   setCatGenre]   = useState(0);
  const [catItems,   setCatItems]   = useState<MediaItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catPage,    setCatPage]    = useState(1);

  /* تحميل بيانات الرئيسية */
  useEffect(() => {
    (async () => {
      try {
        const [trend, np, pm, ota, tr, ptv] = await Promise.all([
          tmdb("/trending/all/week"),
          tmdb("/movie/now_playing"),
          tmdb("/movie/popular"),
          tmdb("/tv/on_the_air"),
          tmdb("/movie/top_rated"),
          tmdb("/tv/popular"),
        ]);
        setHeroSlides(
          (trend.results || [])
            .filter((s: MediaItem) => s.backdrop_path && (s.media_type === "movie" || s.media_type === "tv"))
            .slice(0, 6)
        );
        setTrending((trend.results || []).filter((r: MediaItem) => r.media_type !== "person"));
        setNowPlaying(np.results    || []);
        setPopularMovies(pm.results || []);
        setOnTheAir(ota.results     || []);
        setTopRated(tr.results      || []);
        setPopularTV(ptv.results    || []);
      } catch (e: any) {
        setError(e?.message || "حدث خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* بحث مع تأخير 450ms */
  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const d = await tmdb("/search/multi", { query, include_adult: "false" });
        setResults(
          (d.results || []).filter(
            (r: MediaItem) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
          )
        );
      } catch { setResults([]); }
      finally   { setSearching(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  /* تحميل صفحة الفئات */
  useEffect(() => {
    if (page !== "categories") return;
    setCatLoading(true); setCatPage(1);
    (async () => {
      try {
        const params: Record<string, string | number> = { page: 1, sort_by: "popularity.desc" };
        if (catGenre) params.with_genres = catGenre;
        const d = await tmdb(`/discover/${catType}`, params);
        setCatItems((d.results || []).filter((r: MediaItem) => r.poster_path));
      } catch { setCatItems([]); }
      finally   { setCatLoading(false); }
    })();
  }, [page, catType, catGenre]);

  const loadMoreCat = async () => {
    setCatLoading(true);
    const next = catPage + 1;
    try {
      const params: Record<string, string | number> = { page: next, sort_by: "popularity.desc" };
      if (catGenre) params.with_genres = catGenre;
      const d = await tmdb(`/discover/${catType}`, params);
      setCatItems(prev => [...prev, ...(d.results || []).filter((r: MediaItem) => r.poster_path)]);
      setCatPage(next);
    } catch {}
    setCatLoading(false);
  };

  const genreMap = catType === "tv" ? GENRES_TV : GENRES_MOVIE;

  const select = (item: MediaItem, type: MediaType) => setSelected({ item, type });

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 md:pb-0">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 md:px-8 py-3">
          {/* Logo */}
          <button onClick={() => { setPage("home"); setQuery(""); }}
            className="flex items-center gap-2 text-lg font-black flex-shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg
              bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-lg shadow-blue-500/30">
              <Film size={16} />
            </span>
            <span>سيما<span className="text-blue-400">ماكس</span></span>
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); if (e.target.value) setPage("home"); }}
              placeholder="ابحث عن فيلم أو مسلسل..."
              className="w-full rounded-full bg-zinc-900 border border-white/5
                py-2.5 pr-9 pl-4 text-sm placeholder:text-zinc-500
                focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
            {(["home", "categories", "favorites"] as Page[]).map(p => {
              const labels: Record<Page, string> = { home: "الرئيسية", categories: "الفئات", favorites: "المفضلة" };
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded-lg px-3.5 py-2 text-sm font-bold transition
                    ${page === p ? "bg-blue-500/15 text-blue-300" : "text-zinc-400 hover:text-white"}`}>
                  {labels[p]}
                  {p === "favorites" && favList.length > 0 && (
                    <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center
                      rounded-full bg-blue-500 px-1 text-[10px] text-white">
                      {favList.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* خطأ API */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* ══════════════════ نتائج البحث ══════════════════ */}
      {query.trim() ? (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 min-h-[60vh]">
          <p className="mb-4 text-sm font-bold text-zinc-400">
            {searching ? "جاري البحث…" : `نتائج البحث عن "${query}"`}
          </p>
          {searching ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-400" size={28} />
            </div>
          ) : results?.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">لا توجد نتائج</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
              {results?.map(r => (
                <PosterCard key={`${r.media_type}-${r.id}`} item={r}
                  type={(r.media_type as MediaType) || "movie"}
                  onSelect={select} favSet={favSet} toggleFav={toggleFav} />
              ))}
            </div>
          )}
        </div>

      /* ══════════════════ الرئيسية ══════════════════ */
      ) : page === "home" ? (
        <>
          <HeroCarousel slides={heroSlides} onSelect={select} favSet={favSet} toggleFav={toggleFav} />
          <main className="mx-auto max-w-7xl pt-8">
            {/* الأكثر رواجاً */}
            <div className="mb-3 flex items-center px-4 md:px-8 gap-2">
              <Flame size={17} className="text-amber-400" />
              <h2 className="text-[15px] md:text-lg font-extrabold text-white">الأكثر رواجاً</h2>
            </div>
            <TrendingRow items={trending} loading={loading} onSelect={select} favSet={favSet} toggleFav={toggleFav} />

            <Row title="أفلام تُعرض الآن"     icon={<Film size={16}/>} items={nowPlaying}    type="movie" onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title="مسلسلات تُعرض الآن"   icon={<Tv   size={16}/>} items={onTheAir}      type="tv"    onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title="مسلسلات شائعة"         icon={<Tv   size={16}/>} items={popularTV}     type="tv"    onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title="الأعلى تقييماً"         icon={<Star size={16}/>} items={topRated}      type="movie" onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title="أفلام شائعة"            icon={<Film size={16}/>} items={popularMovies} type="movie" onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
          </main>
        </>

      /* ══════════════════ الفئات ══════════════════ */
      ) : page === "categories" ? (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
          <h2 className="mb-4 text-xl font-extrabold text-white">الفئات</h2>

          {/* أفلام / مسلسلات */}
          <div className="mb-4 flex gap-2">
            {(["movie", "tv"] as MediaType[]).map(t => (
              <button key={t} onClick={() => { setCatType(t); setCatGenre(0); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition
                  ${catType === t ? "bg-gradient-to-l from-blue-600 to-blue-500 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-white/10"}`}>
                {t === "movie" ? <><Film size={15}/> أفلام</> : <><Tv size={15}/> مسلسلات</>}
              </button>
            ))}
          </div>

          {/* genre chips */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setCatGenre(0)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                ${catGenre === 0 ? "bg-blue-500 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-white/10"}`}>
              الكل
            </button>
            {Object.entries(genreMap).map(([gid, gname]) => (
              <button key={gid} onClick={() => setCatGenre(Number(gid))}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                  ${catGenre === Number(gid) ? "bg-blue-500 text-white" : "bg-zinc-900 text-zinc-300 ring-1 ring-white/10"}`}>
                {gname}
              </button>
            ))}
          </div>

          {/* grid */}
          {catLoading && !catItems.length ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-400" size={28} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                {catItems.map(item => (
                  <PosterCard key={`${catType}-${item.id}`} item={item} type={catType}
                    onSelect={select} favSet={favSet} toggleFav={toggleFav} />
                ))}
              </div>
              <button onClick={loadMoreCat} disabled={catLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl
                  bg-zinc-900 py-3 text-sm font-bold text-zinc-300
                  ring-1 ring-white/10 hover:ring-blue-400/40 hover:text-blue-300
                  transition disabled:opacity-50">
                {catLoading ? <Loader2 className="animate-spin" size={16}/> : <ChevronLeft size={16}/>}
                تحميل المزيد
              </button>
            </>
          )}
        </div>

      /* ══════════════════ المفضلة ══════════════════ */
      ) : (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 min-h-[60vh]">
          <h2 className="mb-1 text-xl font-extrabold text-white">مكتبتي</h2>
          <p className="mb-5 text-sm text-zinc-500">محتواك المحفوظ</p>
          {!favList.length ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-zinc-500">
              <Bookmark size={46} className="text-blue-400/50" />
              <p className="font-bold text-zinc-300">لا توجد عناصر محفوظة بعد</p>
              <p className="text-xs">اضغط على أيقونة العلامة على أي بطاقة لحفظها هنا</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
              {favList.map(item => (
                <PosterCard key={`${item.media_type}-${item.id}`}
                  item={item} type={(item.media_type as MediaType) || "movie"}
                  onSelect={select} favSet={favSet} toggleFav={toggleFav} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── نافذة التفاصيل والمشغّل ── */}
      {selected && (
        <DetailsModal
          item={selected.item} type={selected.type}
          onClose={() => setSelected(null)}
          favSet={favSet} toggleFav={toggleFav}
        />
      )}

      {/* ── شريط التنقل السفلي (موبايل) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-around
        border-t border-white/5 bg-zinc-950/90 backdrop-blur-md md:hidden">
        {([
          { id: "home"       as Page, label: "الرئيسية", Icon: Home        },
          { id: "categories" as Page, label: "الفئات",   Icon: LayoutGrid  },
          { id: "favorites"  as Page, label: "المفضلة",  Icon: Bookmark    },
        ] as { id: Page; label: string; Icon: any }[]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setPage(id)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition
              ${page === id ? "text-blue-400" : "text-zinc-500"}`}>
            <Icon size={19} />
            {label}
            {id === "favorites" && favList.length > 0 && (
              <span className="absolute top-1 right-[28%] flex h-4 min-w-4 items-center justify-center
                rounded-full bg-blue-500 px-1 text-[9px] text-white">
                {favList.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <footer className="hidden md:block border-t border-white/5 py-5 text-center text-xs text-zinc-500">
        البيانات من TMDB · لأغراض العرض فقط
      </footer>
    </div>
  );
}
