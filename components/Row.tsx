"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem, MediaType } from "@/lib/tmdb";
import { PosterCard, SkeletonCard } from "./ui";
import { useLanguage } from "./LanguageProvider";

function ScrollBtns({ scroll, className = "" }: { scroll: (d: number) => void; className?: string }) {
  const { locale, t } = useLanguage();
  /* في الواجهة العربية RTL: زر «السابق» يعرض سهم اليمين والعكس صحيح للإنجليزية */
  const PreviousIcon = locale === "en" ? ChevronLeft : ChevronRight;
  const NextIcon = locale === "en" ? ChevronRight : ChevronLeft;
  return (
    <div className={`hidden md:flex gap-2 ${className}`}>
      <button onClick={() => scroll(-1)} aria-label={t.misc.previous}
        className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/10 backdrop-blur
          transition hover:bg-white hover:text-black">
        <PreviousIcon size={16} />
      </button>
      <button onClick={() => scroll(1)} aria-label={t.misc.next}
        className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/10 backdrop-blur
          transition hover:bg-white hover:text-black">
        <NextIcon size={16} />
      </button>
    </div>
  );
}

export function Row({
  title, icon, items, type, onSelect, loading, favSet, toggleFav,
}: {
  title: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  type: MediaType;
  onSelect: (item: MediaItem, type: MediaType) => void;
  loading: boolean;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) =>
    ref.current?.scrollBy({ left: d * -640, behavior: "smooth" });

  if (!loading && !items.length) return null;

  return (
    <section className="mb-8 md:mb-10">
      {/* header */}
      <div className="mb-3 flex items-center justify-between px-4 md:px-10">
        <h2 className="flex items-center gap-2 text-base md:text-xl font-extrabold text-white">
          {icon && <span className="text-zinc-500">{icon}</span>}
          {title}
        </h2>
        <ScrollBtns scroll={scroll} />
      </div>

      {/* scroll track */}
      <div ref={ref}
        className="flex gap-3 overflow-x-auto px-4 md:px-10 pb-2
          scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.slice(0, 18).map(item => (
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

/* صف «الأكثر رواجاً» (نوع مختلط movie/tv) */
export function TrendingRow({
  items, loading, onSelect, favSet, toggleFav,
}: {
  items: MediaItem[];
  loading: boolean;
  onSelect: (item: MediaItem, type: MediaType) => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) =>
    ref.current?.scrollBy({ left: d * -640, behavior: "smooth" });

  return (
    <section className="mb-8 md:mb-10">
      <div className="mb-3 flex items-center justify-between px-4 md:px-10">
        <h2 className="text-base md:text-xl font-extrabold text-white">{t.media.trending}</h2>
        <ScrollBtns scroll={scroll} />
      </div>
      <div ref={ref}
        className="flex gap-3 overflow-x-auto px-4 md:px-10 pb-2
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

/* صف «أفضل 10» — أرقام ضخمة بحدود خلف الملصقات */
export function TopTenRow({
  title, items, type, onSelect, loading, favSet, toggleFav,
}: {
  title: string;
  items: MediaItem[];
  type: MediaType;
  onSelect: (item: MediaItem, type: MediaType) => void;
  loading: boolean;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const { locale } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) =>
    ref.current?.scrollBy({ left: d * -760, behavior: "smooth" });

  if (!loading && !items.length) return null;

  return (
    <section className="mb-8 md:mb-10">
      <div className="mb-3 flex items-center justify-between px-4 md:px-10">
        <h2 className="text-base md:text-xl font-extrabold text-white">{title}</h2>
        <ScrollBtns scroll={scroll} />
      </div>
      <div ref={ref}
        className="flex items-center gap-0 overflow-x-auto px-4 md:px-10 pb-2
          scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[200px] md:w-[240px] h-[150px] md:h-[186px] mx-2 rounded-xl bg-[#15151a] animate-pulse" />
            ))
          : items.slice(0, 10).map((item, i) => (
              <div key={`${type}-top-${item.id}`}
                className={`group flex flex-shrink-0 items-center cursor-pointer ${locale === "en" ? "flex-row-reverse" : ""}`}
                onClick={() => onSelect(item, type)}>
                <span className="top10-num text-[7rem] md:text-[9rem] transition-transform duration-300 group-hover:scale-105">
                  {i + 1}
                </span>
                <div className="z-10 w-[100px] md:w-[125px] -ms-3 md:-ms-6">
                  <PosterCard item={item} type={type}
                    onSelect={onSelect} favSet={favSet} toggleFav={toggleFav} />
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}

/* صف القنوات والخدمات — شعارات نصية أنيقة */
export function ChannelsRow({ title }: { title: string }) {
  const channels: { name: string; cls: string }[] = [
    { name: "NETFLIX",     cls: "font-black tracking-tight text-[15px]" },
    { name: "prime video", cls: "font-semibold tracking-tight text-[13px]" },
    { name: "Disney+",     cls: "font-extrabold text-[15px]" },
    { name: "HBO max",     cls: "font-black tracking-tight text-[13px]" },
    { name: "Apple TV+",   cls: "font-semibold text-[14px]" },
    { name: "hulu",        cls: "font-black text-[16px]" },
    { name: "Paramount+",  cls: "font-bold text-[13px]" },
    { name: "crunchyroll", cls: "font-black lowercase tracking-tight text-[13px]" },
  ];

  return (
    <section className="mb-8 md:mb-10">
      <h2 className="mb-3 px-4 md:px-10 text-base md:text-xl font-extrabold text-white">{title}</h2>
      <div
        className="flex gap-3 overflow-x-auto px-4 md:px-10 pb-2
          scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {channels.map(c => (
          <div key={c.name}
            className="flex h-[68px] flex-shrink-0 items-center justify-center rounded-xl
              bg-[#15151a] px-8 ring-1 ring-white/10 transition
              hover:bg-[#1c1c22] hover:ring-white/25">
            <span dir="ltr" className={`${c.cls} text-zinc-500 transition-colors hover:text-white`}>
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
