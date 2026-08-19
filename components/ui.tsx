"use client";
import { Star, Bookmark, Film } from "lucide-react";
import { IMG, MediaItem, MediaType } from "@/lib/tmdb";

/* ── Rating pill ── */
export function Rating({ value, size = "sm" }: { value?: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-black/70 ${cls} font-bold text-amber-300 backdrop-blur ring-1 ring-white/10`}>
      <Star size={size === "sm" ? 10 : 12} className="fill-amber-300" />
      {value ? value.toFixed(1) : "—"}
    </span>
  );
}

/* ── Bookmark button ── */
export function FavBtn({
  active, onToggle, size = 32,
}: { active: boolean; onToggle: () => void; size?: number }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-lg backdrop-blur transition-all ring-1
        ${active
          ? "bg-blue-600/30 text-blue-300 ring-blue-400/50"
          : "bg-black/55 text-zinc-200 ring-white/10 hover:text-blue-300"}`}
    >
      <Bookmark size={Math.round(size * 0.45)} className={active ? "fill-current" : ""} />
    </button>
  );
}

/* ── Poster card ── */
export function PosterCard({
  item, type, onSelect, favSet, toggleFav,
}: {
  item: MediaItem;
  type: MediaType;
  onSelect: (item: MediaItem, type: MediaType) => void;
  favSet: Set<string>;
  toggleFav: (item: MediaItem, type: MediaType) => void;
}) {
  const year  = (item.release_date || item.first_air_date || "").slice(0, 4);
  const title = item.title || item.name || "بلا عنوان";
  const isFav = favSet.has(`${type}-${item.id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item, type)}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item, type);
        }
      }}
      className="group relative flex-shrink-0 w-full cursor-pointer text-right rounded-xl overflow-hidden
        bg-zinc-900 ring-1 ring-white/5 transition-all duration-300
        hover:ring-blue-400/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
        {item.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${IMG}${item.poster_path}`}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Film size={28} />
          </div>
        )}
        {/* gradient */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 to-transparent" />
        {/* badge top-left */}
        <div className="absolute left-1.5 top-1.5">
          <Rating value={item.vote_average} />
        </div>
        {/* fav top-right */}
        <div className="absolute right-1.5 top-1.5">
          <FavBtn active={isFav} onToggle={() => toggleFav(item, type)} size={28} />
        </div>
        {/* play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40">
            ▶
          </span>
        </div>
        {/* info bottom */}
        <div className="absolute inset-x-2 bottom-2">
          <h3 className="line-clamp-1 text-[12px] font-bold text-white">{title}</h3>
          <p className="text-[10px] text-zinc-400">
            {type === "movie" ? "فيلم" : "مسلسل"}{year ? ` · ${year}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton card ── */
export function SkeletonCard() {
  return <div className="flex-shrink-0 w-[140px] md:w-[170px] aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />;
}
