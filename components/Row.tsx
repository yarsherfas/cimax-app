"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem, MediaType } from "@/lib/tmdb";
import { PosterCard, SkeletonCard } from "./ui";

export function Row({
  title, icon, items, type, onSelect, loading, favSet, toggleFav, accent,
}: {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  type: MediaType;
  onSelect: (item: MediaItem, type: MediaType) => void;
  loading: boolean;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
  accent?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) =>
    ref.current?.scrollBy({ left: d * -640, behavior: "smooth" });

  if (!loading && !items.length) return null;

  return (
    <section className="mb-8">
      {/* header */}
      <div className="mb-3 flex items-center justify-between px-4 md:px-8">
        <h2 className="flex items-center gap-2 text-[15px] md:text-lg font-extrabold text-white">
          <span className={accent || "text-blue-400"}>{icon}</span>
          {title}
        </h2>
        <div className="hidden md:flex gap-1">
          <button onClick={() => scroll(-1)}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-400
              hover:text-blue-400 hover:border-blue-400/40 transition">
            <ChevronRight size={15} />
          </button>
          <button onClick={() => scroll(1)}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-400
              hover:text-blue-400 hover:border-blue-400/40 transition">
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* scroll track */}
      <div ref={ref}
        className="flex gap-2.5 overflow-x-auto px-4 md:px-8 pb-2
          scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.slice(0, 16).map(item => (
              <div key={`${type}-${item.id}`}
                className="flex-shrink-0 w-[140px] md:w-[170px]">
                <PosterCard item={item} type={type}
                  onSelect={onSelect} favSet={favSet} toggleFav={toggleFav} />
              </div>
            ))}
      </div>
    </section>
  );
}

/* صف "الأكثر رواجاً" (نوع مختلط movie/tv) */
export function TrendingRow({
  items, loading, onSelect, favSet, toggleFav,
}: {
  items: MediaItem[];
  loading: boolean;
  onSelect: (item: MediaItem, type: MediaType) => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) =>
    ref.current?.scrollBy({ left: d * -640, behavior: "smooth" });

  return (
    <section className="mb-8">
      <div className="hidden md:flex justify-end gap-1 px-8 mb-2">
        <button onClick={() => scroll(-1)}
          className="rounded-lg border border-white/10 p-1.5 text-zinc-400
            hover:text-amber-400 hover:border-amber-400/40 transition">
          <ChevronRight size={15} />
        </button>
        <button onClick={() => scroll(1)}
          className="rounded-lg border border-white/10 p-1.5 text-zinc-400
            hover:text-amber-400 hover:border-amber-400/40 transition">
          <ChevronLeft size={15} />
        </button>
      </div>
      <div ref={ref}
        className="flex gap-2.5 overflow-x-auto px-4 md:px-8 pb-2
          scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.slice(0, 18).map(item => {
              const t: MediaType = item.media_type === "tv" ? "tv" : "movie";
              return (
                <div key={`tr-${t}-${item.id}`}
                  className="flex-shrink-0 w-[140px] md:w-[170px]">
                  <PosterCard item={item} type={t}
                    onSelect={onSelect} favSet={favSet} toggleFav={toggleFav} />
                </div>
              );
            })}
      </div>
    </section>
  );
}
