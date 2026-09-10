"use client";
import { Bookmark, Film, Play } from "lucide-react";
import type { AnimeItem } from "@/lib/anime";
import { useLanguage } from "./LanguageProvider";

export function AnimeCard({
  item, onSelect, favSet, toggleFav,
}: {
  item: AnimeItem;
  onSelect: (item: AnimeItem) => void;
  favSet: Set<string>;
  toggleFav: (item: AnimeItem) => void;
}) {
  const { t } = useLanguage();
  const isFav = favSet.has(`anime-${item.mal_id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group relative flex-shrink-0 w-full cursor-pointer text-right rounded-xl overflow-hidden
        bg-[#15151a] ring-1 ring-white/10 transition-all duration-300
        hover:ring-white/40 hover:shadow-2xl hover:shadow-black/60"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
        {item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600">
            <Film size={28} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 to-transparent" />
        <div className="absolute left-1.5 top-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5
            text-[10px] font-bold text-amber-300 backdrop-blur ring-1 ring-white/10">
            {item.score || "—"}
          </span>
        </div>
        <div className="absolute right-1.5 top-1.5">
          <button
            onClick={e => { e.stopPropagation(); toggleFav(item); }}
            style={{ width: 28, height: 28 }}
            className={`flex items-center justify-center rounded-full backdrop-blur transition-all ring-1
              ${isFav
                ? "bg-white text-black ring-white"
                : "bg-black/55 text-zinc-200 ring-white/15 hover:text-white hover:ring-white/50"}`}
          >
            <Bookmark size={13} className={isFav ? "fill-current" : ""} />
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl shadow-black/50">
            <Play size={16} className="fill-black" />
          </span>
        </div>
        <div className="absolute inset-x-2 bottom-2">
          <h3 className="line-clamp-2 text-[12px] font-bold text-white leading-snug">{item.title}</h3>
          <p className="text-[10px] text-zinc-400">
            {t.media.anime}{item.episodes ? ` · ${item.episodes} ${t.player.episodeShort}` : ""}
            {item.year ? ` · ${item.year}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AnimeSkeletonCard() {
  return <div className="flex-shrink-0 w-full aspect-[2/3] rounded-xl bg-zinc-900 animate-pulse" />;
}
