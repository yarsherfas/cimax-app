"use client";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { BACKDROP, MediaItem, MediaType } from "@/lib/tmdb";
import { FavBtn, Rating } from "./ui";

export function HeroCarousel({
  slides, onSelect, favSet, toggleFav,
}: {
  slides: MediaItem[];
  onSelect: (item: MediaItem, type: MediaType) => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const [idx, setIdx]           = useState(0);
  const [progress, setProgress] = useState(0);
  const DELAY = 6000;

  useEffect(() => {
    if (slides.length < 2) return;
    setProgress(0);
    const start = Date.now();
    const raf = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - start) / DELAY) * 100));
    }, 50);
    const tmr = setTimeout(() => setIdx(i => (i + 1) % slides.length), DELAY);
    return () => { clearInterval(raf); clearTimeout(tmr); };
  }, [idx, slides.length]);

  if (!slides.length)
    return <div className="h-[46vh] md:h-[64vh] w-full bg-zinc-900 animate-pulse" />;

  const slide = slides[idx];
  const title = slide.title || slide.name;
  const year  = (slide.release_date || slide.first_air_date || "").slice(0, 4);
  const type  = (slide.media_type === "tv" ? "tv" : "movie") as MediaType;
  const isFav = favSet.has(`${type}-${slide.id}`);

  return (
    <section className="relative h-[46vh] md:h-[64vh] w-full overflow-hidden bg-black select-none">
      {/* slides */}
      {slides.map((s, i) => (
        <div key={s.id} className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 2 : 1 }}>
          {s.backdrop_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${BACKDROP}${s.backdrop_path}`} alt=""
              className="h-full w-full object-cover object-top" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent" />
        </div>
      ))}

      {/* progress bar */}
      <div className="absolute top-0 inset-x-0 z-10 h-[2px] bg-white/10">
        <div className="h-full bg-gradient-to-l from-blue-500 to-sky-400"
          style={{ width: `${progress}%`, transition: "width 50ms linear" }} />
      </div>

      {/* content */}
      <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-4 md:px-10 pb-8 max-w-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-blue-500/15 px-2.5 py-1 text-[11px] font-bold text-blue-300 ring-1 ring-blue-400/30">
            {type === "tv" ? "📺 مسلسل" : "🎬 فيلم"}
          </span>
          <Rating value={slide.vote_average} size="md" />
          {year && <span className="text-[12px] text-zinc-400">{year}</span>}
        </div>

        <h1 className="text-2xl md:text-4xl font-black leading-tight text-white drop-shadow-lg">
          {title}
        </h1>

        <p className="line-clamp-2 md:line-clamp-3 text-xs md:text-sm text-zinc-300 leading-6 max-w-xl">
          {slide.overview}
        </p>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onSelect(slide, type)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500
              px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/30
              hover:brightness-110 transition-all active:scale-95"
          >
            <Play size={15} className="fill-white" /> مشاهدة الآن
          </button>
          <FavBtn active={isFav} onToggle={() => toggleFav(slide, type)} size={44} />
        </div>
      </div>

      {/* dots */}
      <div className="absolute bottom-3 left-4 md:left-10 z-10 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-blue-400" : "w-2.5 bg-white/25"}`}
          />
        ))}
      </div>
    </section>
  );
}
