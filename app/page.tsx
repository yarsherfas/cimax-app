"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search, Star, Film, Tv, Loader2, Bookmark,
  ChevronLeft, ChevronRight, X, Home, Sparkles,
} from "lucide-react";
import { genresFor, MediaItem, MediaType, tmdb } from "@/lib/tmdb";
import { AnimeItem, fetchRecentAnime, searchAnime } from "@/lib/anime";
import { localeConfig } from "@/lib/i18n";
import { PosterCard, SkeletonCard } from "@/components/ui";
import { AnimeCard, AnimeSkeletonCard } from "@/components/AnimeCard";
import { AnimeModal } from "@/components/AnimeModal";
import { HeroCarousel } from "@/components/Hero";
import { Row, TrendingRow, TopTenRow, ChannelsRow } from "@/components/Row";
import { DetailsModal } from "@/components/Player";
import { useLanguage } from "@/components/LanguageProvider";

type Page = "home" | "movies" | "shows" | "animes" | "favorites";

/* مفاتيح حفظ المفضلة في المتصفح (تبقى بعد التحديث/الإغلاق) */
const FAV_KEY = "cimax:favorites";
const ANIME_FAV_KEY = "cimax:anime-favorites";

export default function CimaxPage() {
  const { locale, t } = useLanguage();

  const NAV: { id: Page; label: string; Icon: any }[] = [
    { id: "home",      label: t.nav.home,      Icon: Home     },
    { id: "movies",    label: t.nav.movies,    Icon: Film     },
    { id: "shows",     label: t.nav.shows,     Icon: Tv       },
    { id: "animes",    label: t.nav.anime,     Icon: Sparkles },
    { id: "favorites", label: t.nav.favorites, Icon: Bookmark },
  ];

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
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem | null>(null);
  const [page,     setPage]     = useState<Page>("home");
  const [scrolled, setScrolled] = useState(false);

  /* ── أنيمي ── */
  const [animeList,    setAnimeList]    = useState<AnimeItem[]>([]);
  const [animeLoading, setAnimeLoading] = useState(false);
  const [animePage,    setAnimePage]    = useState(1);
  const [animeTotal,   setAnimeTotal]   = useState(1);
  const [animeResults, setAnimeResults] = useState<AnimeItem[] | null>(null);
  const [animeSearching, setAnimeSearching] = useState(false);

  /* ── مفضلة ── */
  const [favorites, setFavorites] = useState<Map<string, MediaItem>>(new Map());
  const [animeFavorites, setAnimeFavorites] = useState<Map<number, AnimeItem>>(new Map());
  const favSet  = new Set(favorites.keys());
  const animeFavSet = new Set(Array.from(animeFavorites.keys()).map(id => `anime-${id}`));
  const favList = Array.from(favorites.values());
  const animeFavList = Array.from(animeFavorites.values());

  const toggleFav = useCallback((item: MediaItem, type: MediaType) => {
    setFavorites(prev => {
      const next = new Map(prev);
      const key = `${type}-${item.id}`;
      next.has(key) ? next.delete(key) : next.set(key, { ...item, media_type: type });
      return next;
    });
  }, []);

  const toggleAnimeFav = useCallback((item: AnimeItem) => {
    setAnimeFavorites(prev => {
      const next = new Map(prev);
      next.has(item.mal_id) ? next.delete(item.mal_id) : next.set(item.mal_id, item);
      return next;
    });
  }, []);

  // تحميل المفضلة المحفوظة عند فتح الموقع
  useEffect(() => {
    try {
      const rawFav = localStorage.getItem(FAV_KEY);
      if (rawFav) {
        const items: MediaItem[] = JSON.parse(rawFav);
        setFavorites(new Map(items.map(i => [`${i.media_type}-${i.id}`, i])));
      }
    } catch {}
    try {
      const rawAnime = localStorage.getItem(ANIME_FAV_KEY);
      if (rawAnime) {
        const items: AnimeItem[] = JSON.parse(rawAnime);
        setAnimeFavorites(new Map(items.map(i => [i.mal_id, i])));
      }
    } catch {}
  }, []);

  // حفظ المفضلة عند كل تغيير
  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites.values()))); } catch {}
  }, [favorites]);

  useEffect(() => {
    try { localStorage.setItem(ANIME_FAV_KEY, JSON.stringify(Array.from(animeFavorites.values()))); } catch {}
  }, [animeFavorites]);

  /* ── تصفح الأفلام/المسلسلات بالفئات ── */
  const catType: MediaType = page === "shows" ? "tv" : "movie";
  const [catGenre,   setCatGenre]   = useState(0);
  const [catItems,   setCatItems]   = useState<MediaItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catPage,    setCatPage]    = useState(1);

  /* شفافية الهيدر فوق البانر */
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  /* تحميل بيانات الرئيسية — بلغة الواجهة */
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const lang = localeConfig[locale].apiLanguage;
        const [trend, np, pm, ota, tr, ptv] = await Promise.all([
          tmdb("/trending/all/week", { language: lang }),
          tmdb("/movie/now_playing", { language: lang }),
          tmdb("/movie/popular", { language: lang }),
          tmdb("/tv/on_the_air", { language: lang }),
          tmdb("/movie/top_rated", { language: lang }),
          tmdb("/tv/popular", { language: lang }),
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
        setError(null);
      } catch (e: any) {
        setError(e?.message || t.misc.error);
      } finally {
        setLoading(false);
      }
    })();
  }, [locale, t.misc.error]);

  /* بحث مع تأخير 450ms — بلغة الواجهة */
  useEffect(() => {
    if (!query.trim()) { setResults(null); setAnimeResults(null); return; }

    if (page === "animes") {
      setAnimeSearching(true);
      const t0 = setTimeout(async () => {
        try {
          setAnimeResults(await searchAnime(query, locale));
        } catch { setAnimeResults([]); }
        finally { setAnimeSearching(false); }
      }, 450);
      return () => clearTimeout(t0);
    }

    setSearching(true);
    const t0 = setTimeout(async () => {
      try {
        const d = await tmdb("/search/multi", { query, include_adult: "false", language: localeConfig[locale].apiLanguage });
        setResults(
          (d.results || []).filter(
            (r: MediaItem) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path
          )
        );
      } catch { setResults([]); }
      finally   { setSearching(false); }
    }, 450);
    return () => clearTimeout(t0);
  }, [query, page, locale]);

  /* تحميل صفحة الأنيمي */
  useEffect(() => {
    if (page !== "animes") return;
    setAnimeLoading(true);
    setAnimePage(1);
    fetchRecentAnime(1, 24, locale)
      .then(d => { setAnimeList(d.items); setAnimeTotal(d.totalPages); })
      .catch(() => setAnimeList([]))
      .finally(() => setAnimeLoading(false));
  }, [page, locale]);

  const loadMoreAnime = async () => {
    if (animePage >= animeTotal) return;
    setAnimeLoading(true);
    const next = animePage + 1;
    try {
      const d = await fetchRecentAnime(next, 24, locale);
      setAnimeList(prev => [...prev, ...d.items]);
      setAnimePage(next);
    } catch {}
    setAnimeLoading(false);
  };

  /* تحميل شبكة أفلام/مسلسلات بحسب الفئة — بلغة الواجهة */
  useEffect(() => {
    if (page !== "movies" && page !== "shows") return;
    setCatLoading(true); setCatPage(1);
    (async () => {
      try {
        const params: Record<string, string | number> = {
          page: 1,
          sort_by: "popularity.desc",
          language: localeConfig[locale].apiLanguage,
        };
        if (catGenre) params.with_genres = catGenre;
        const d = await tmdb(`/discover/${catType}`, params);
        setCatItems((d.results || []).filter((r: MediaItem) => r.poster_path));
      } catch { setCatItems([]); }
      finally { setCatLoading(false); }
    })();
  }, [page, catType, catGenre, locale]);

  const loadMoreCat = async () => {
    setCatLoading(true);
    const next = catPage + 1;
    try {
      const params: Record<string, string | number> = {
        page: next,
        sort_by: "popularity.desc",
        language: localeConfig[locale].apiLanguage,
      };
      if (catGenre) params.with_genres = catGenre;
      const d = await tmdb(`/discover/${catType}`, params);
      setCatItems(prev => [...prev, ...(d.results || []).filter((r: MediaItem) => r.poster_path)]);
      setCatPage(next);
    } catch {}
    setCatLoading(false);
  };

  const genreMap = genresFor(catType, locale);
  const MoreIcon = locale === "en" ? ChevronRight : ChevronLeft;

  const select = (item: MediaItem, type: MediaType) => setSelected({ item, type });

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 pb-16 md:pb-0">

      {/* ── Header ── */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300
        ${scrolled
          ? "bg-[#0a0a0c]/95 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/40"
          : "bg-gradient-to-b from-black/85 via-black/45 to-transparent"}`}>
        <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-4 md:px-10 py-3.5">

          {/* Logo */}
          <button onClick={() => { setPage("home"); setQuery(""); }}
            className="flex items-center gap-2.5 text-lg font-black flex-shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg
              bg-white text-black shadow-lg">
              <Film size={16} />
            </span>
            <span>{t.brand.first}<span className="text-zinc-500">{t.brand.second}</span></span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
            {NAV.filter(n => n.id !== "favorites").map(n => (
              <button key={n.id} onClick={() => { setPage(n.id); if (n.id !== "animes") setQuery(""); }}
                className={`rounded-full px-4 py-2 text-sm font-bold transition
                  ${page === n.id
                    ? "bg-white/15 text-white"
                    : "text-zinc-400 hover:text-white"}`}>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-full max-w-[240px] md:max-w-xs">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); if (e.target.value && page === "favorites") setPage("home"); }}
              placeholder={page === "animes" ? t.search.animePlaceholder : t.search.placeholder}
              className="w-full rounded-full bg-white/10 border border-white/10
                py-2.5 ps-9 pe-4 text-sm placeholder:text-zinc-500
                focus:outline-none focus:border-white/30 focus:bg-white/15 transition"
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sign-in style button (favorites) */}
          <button onClick={() => { setPage("favorites"); setQuery(""); }}
            className={`hidden md:flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition
              ${page === "favorites"
                ? "bg-white text-black"
                : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"}`}>
            <Bookmark size={14} />
            {t.favorites.title}
            {(favList.length + animeFavList.length) > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center
                rounded-full bg-black/40 px-1 text-[10px] font-black text-white">
                {favList.length + animeFavList.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* خطأ API */}
      {error && (
        <div className="fixed top-20 inset-x-0 z-30 mx-auto max-w-7xl px-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 backdrop-blur">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* ══════════════════ نتائج البحث ══════════════════ */}
      {query.trim() ? (
        <div className="mx-auto max-w-[1600px] px-4 md:px-10 pt-24 pb-6 min-h-[60vh]">
          <p className="mb-4 text-sm font-bold text-zinc-400">
            {(page === "animes" ? animeSearching : searching)
              ? t.search.searching
              : t.search.results(query)}
          </p>
          {page === "animes" ? (
            animeSearching ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-zinc-300" size={28} />
              </div>
            ) : animeResults?.length === 0 ? (
              <div className="py-20 text-center text-zinc-500">{t.search.noAnimeResults}</div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {animeResults?.map(a => (
                  <AnimeCard key={`anime-${a.mal_id}`} item={a}
                    onSelect={setSelectedAnime} favSet={animeFavSet} toggleFav={toggleAnimeFav} />
                ))}
              </div>
            )
          ) : searching ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-zinc-300" size={28} />
            </div>
          ) : results?.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">{t.search.noResults}</div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
          <main className="relative z-10 mx-auto max-w-[1600px] -mt-10 md:-mt-16">
            <TrendingRow items={trending} loading={loading} onSelect={select} favSet={favSet} toggleFav={toggleFav} />

            <ChannelsRow title={t.home.channels} />

            <TopTenRow title={t.home.topMovies} items={popularMovies} type="movie"
              onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />

            <TopTenRow title={t.home.topShows} items={popularTV} type="tv"
              onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />

            <Row title={t.home.nowMovies} icon={<Film size={16}/>} items={nowPlaying} type="movie" onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title={t.home.nowShows} icon={<Tv   size={16}/>} items={onTheAir}   type="tv"    onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
            <Row title={t.home.topRated} icon={<Star size={16}/>} items={topRated}    type="movie" onSelect={select} loading={loading} favSet={favSet} toggleFav={toggleFav} />
          </main>
        </>

      /* ══════════════════ أفلام / مسلسلات ══════════════════ */
      ) : page === "movies" || page === "shows" ? (
        <div className="mx-auto max-w-[1600px] px-4 md:px-10 pt-24 pb-6 min-h-[60vh]">
          <div className="mb-6 flex items-center gap-3">
            {catType === "movie"
              ? <Film size={24} className="text-zinc-500" />
              : <Tv size={24} className="text-zinc-500" />}
            <h2 className="text-2xl font-black text-white">{catType === "movie" ? t.nav.movies : t.nav.shows}</h2>
          </div>

          {/* genre chips */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setCatGenre(0)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                ${catGenre === 0 ? "bg-white text-black" : "bg-white/10 text-zinc-300 ring-1 ring-white/10 hover:bg-white/20"}`}>
              {t.media.popular}
            </button>
            {Object.entries(genreMap).map(([gid, gname]) => (
              <button key={gid} onClick={() => setCatGenre(Number(gid))}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition
                  ${catGenre === Number(gid) ? "bg-white text-black" : "bg-white/10 text-zinc-300 ring-1 ring-white/10 hover:bg-white/20"}`}>
                {gname}
              </button>
            ))}
          </div>

          {catLoading && !catItems.length ? (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: 16 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : catItems.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">{t.search.noResults}</div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {catItems.map(item => (
                  <PosterCard key={`${catType}-${item.id}`} item={item} type={catType}
                    onSelect={select} favSet={favSet} toggleFav={toggleFav} />
                ))}
              </div>
              <button onClick={loadMoreCat} disabled={catLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full
                  bg-white/10 py-3 text-sm font-bold text-white
                  ring-1 ring-white/15 hover:bg-white/20
                  transition disabled:opacity-50">
                {catLoading ? <Loader2 className="animate-spin" size={16}/> : <MoreIcon size={16}/>}
                {t.media.loadMore}
              </button>
            </>
          )}
        </div>

      /* ══════════════════ الأنيمي ══════════════════ */
      ) : page === "animes" ? (
        <div className="mx-auto max-w-[1600px] px-4 md:px-10 pt-24 pb-6 min-h-[60vh]">
          <div className="mb-6 flex items-center gap-3">
            <Sparkles size={24} className="text-zinc-500" />
            <div>
              <h2 className="text-2xl font-black text-white">{t.anime.title}</h2>
              <p className="text-xs text-zinc-500">{t.anime.subtitle}</p>
            </div>
          </div>

          {animeLoading && !animeList.length ? (
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: 16 }).map((_, i) => <AnimeSkeletonCard key={i} />)}
            </div>
          ) : animeList.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">{t.anime.unavailable}</div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {animeList.map(a => (
                  <AnimeCard key={`anime-${a.mal_id}`} item={a}
                    onSelect={setSelectedAnime} favSet={animeFavSet} toggleFav={toggleAnimeFav} />
                ))}
              </div>
              {animePage < animeTotal && (
                <button onClick={loadMoreAnime} disabled={animeLoading}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full
                    bg-white/10 py-3 text-sm font-bold text-white
                    ring-1 ring-white/15 hover:bg-white/20
                    transition disabled:opacity-50">
                  {animeLoading ? <Loader2 className="animate-spin" size={16}/> : <MoreIcon size={16}/>}
                  {t.media.loadMore}
                </button>
              )}
            </>
          )}
        </div>

      /* ══════════════════ المفضلة ══════════════════ */
      ) : (
        <div className="mx-auto max-w-[1600px] px-4 md:px-10 pt-24 pb-6 min-h-[60vh]">
          <h2 className="mb-1 text-2xl font-black text-white">{t.favorites.title}</h2>
          <p className="mb-6 text-sm text-zinc-500">{t.favorites.subtitle}</p>
          {!favList.length && !animeFavList.length ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center text-zinc-500">
              <Bookmark size={46} className="text-zinc-700" />
              <p className="font-bold text-zinc-300">{t.favorites.empty}</p>
              <p className="text-xs">{t.favorites.hint}</p>
            </div>
          ) : (
            <>
              {animeFavList.length > 0 && (
                <>
                  <h3 className="mb-3 text-sm font-bold text-zinc-400">{t.favorites.animeSection} ({animeFavList.length})</h3>
                  <div className="mb-8 grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {animeFavList.map(item => (
                      <AnimeCard key={`fav-anime-${item.mal_id}`} item={item}
                        onSelect={setSelectedAnime} favSet={animeFavSet} toggleFav={toggleAnimeFav} />
                    ))}
                  </div>
                </>
              )}
              {favList.length > 0 && (
                <>
                  <h3 className="mb-3 text-sm font-bold text-zinc-400">{t.favorites.moviesShowsSection} ({favList.length})</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {favList.map(item => (
                      <PosterCard key={`${item.media_type}-${item.id}`}
                        item={item} type={(item.media_type as MediaType) || "movie"}
                        onSelect={select} favSet={favSet} toggleFav={toggleFav} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── نافذة التفاصيل والمشغّل ── */}
      {selected && (
        <DetailsModal
          item={selected.item} type={selected.type}
          onClose={() => setSelected(null)}
          onSelect={(item, type) => setSelected({ item, type })}
          favSet={favSet} toggleFav={toggleFav}
        />
      )}

      {selectedAnime && (
        <AnimeModal
          item={selectedAnime}
          onClose={() => setSelectedAnime(null)}
          favSet={animeFavSet}
          toggleFav={toggleAnimeFav}
        />
      )}

      {/* ── شريط التنقل السفلي (موبايل) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-around
        border-t border-white/5 bg-[#0a0a0c]/95 backdrop-blur-md md:hidden">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => { setPage(id); if (id !== "animes") setQuery(""); }}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition
              ${page === id ? "text-white" : "text-zinc-500"}`}>
            <Icon size={19} />
            {label}
            {id === "favorites" && (favList.length + animeFavList.length) > 0 && (
              <span className="absolute top-1 end-[28%] flex h-4 min-w-4 items-center justify-center
                rounded-full bg-white px-1 text-[9px] font-black text-black">
                {favList.length + animeFavList.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-sm font-black text-white">{t.brand.first}<span className="text-zinc-600">{t.brand.second}</span></p>
        <p className="mt-1.5 text-[11px] text-zinc-600">{t.misc.footer}</p>
      </footer>
    </div>
  );
}
