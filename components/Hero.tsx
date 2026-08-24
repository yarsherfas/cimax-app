"use client";
import { useEffect, useState } from "react";
import { Play, Info } from "lucide-react";
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
  const [idx, setIdx] = useState(0);
  const DELAY = 7000;

  useEffect(() => {
    if (slides.length < 2) return;
    const tmr = setTimeout(() => setIdx(i => (i + 1) % slides.length), DELAY);
    return () => clearTimeout(tmr);
  }, [idx, slides.length]);

  if (!slides.length)
    return <div className="h-[60vh] md:h-[78vh] w-full bg-[#101014] animate-pulse" />;

  const slide = slides[idx];
  const title = slide.title || slide.name;
  const year  = (slide.release_date || slide.first_air_date || "").slice(0, 4);
  const type  = (slide.media_type === "tv" ? "tv" : "movie") as MediaType;
  const isFav = favSet.has(`${type}-${slide.id}`);

  return (
    <section className="relative h-[62vh] md:h-[78vh] w-full overflow-hidden bg-black select-none">
      {/* slides */}
      {slides.map((s, i) => (
        <div key={s.id} className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 2 : 1 }}>
          {s.backdrop_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${BACKDROP}${s.backdrop_path}`} alt=""
              className="h-full w-full object-cover object-top" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0a0a0c]/90 via-[#0a0a0c]/25 to-transparent" />
        </div>
      ))}

      {/* content */}
      <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-4 md:px-12 pb-10 md:pb-16 max-w-3xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white
            ring-1 ring-white/20 backdrop-blur">
            {type === "tv" ? "مسلسل" : "فيلم"}
          </span>
          <Rating value={slide.vote_average} size="md" />
          {year && <span className="text-[12px] text-zinc-300">{year}</span>}
        </div>

        <h1 className="text-3xl md:text-6xl font-black leading-tight text-white drop-shadow-2xl">
          {title}
        </h1>

        <p className="hidden md:block line-clamp-2 text-sm text-zinc-300 leading-6 max-w-xl">
          {slide.overview}
        </p>

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => onSelect(slide, type)}
            className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-extrabold
              text-black shadow-2xl shadow-black/50 transition hover:bg-zinc-200 active:scale-95"
          >
            <Play size={16} className="fill-black" /> شاهد الآن
          </button>
          <button
            onClick={() => onSelect(slide, type)}
            className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold
              text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
          >
            <Info size={16} /> معلومات
          </button>
          <FavBtn active={isFav} onToggle={() => toggleFav(slide, type)} size={46} />
        </div>
      </div>

      {/* dots */}
      <div className="absolute bottom-4 left-4 md:left-12 z-10 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`شريحة ${i + 1}`}
            className={`h-1 rounded-full transition-all ${i === idx ? "w-7 bg-white" : "w-3 bg-white/30 hover:bg-white/60"}`} />
        ))}
      </div>
    </section>
  );
}
