"use client";
import { useEffect, useState } from "react";
import { Loader2, Play, Shield } from "lucide-react";

export const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

/** Blocks new-tab ads — omitted for VidKing/VidLink which refuse sandboxed iframes */
export const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-presentation allow-forms";

const WARMUP_MS = 1500;

export function EmbedPlayer({
  src,
  title,
  reloadKey,
  accent = "blue",
  blockPopups = true,
}: {
  src: string;
  title: string;
  reloadKey: string | number;
  accent?: "blue" | "violet";
  /** false for VidKing/VidLink — they block sandboxed embeds */
  blockPopups?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [warming, setWarming] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActivated(false);
    setWarming(false);
    const t = setTimeout(() => setLoading(false), 4000);
    return () => clearTimeout(t);
  }, [reloadKey]);

  useEffect(() => {
    if (!activated || blockPopups) return;
    setWarming(true);
    const t = setTimeout(() => setWarming(false), WARMUP_MS);
    return () => clearTimeout(t);
  }, [activated, blockPopups, reloadKey]);

  const spin = accent === "violet" ? "text-violet-400" : "text-zinc-300";
  const iframeInteractive = activated && !warming;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
      style={{ height: "min(70vh, 720px)" }}
    >
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950">
          <Loader2 className={`animate-spin ${spin}`} size={32} />
          <span className="text-xs text-zinc-500">جاري تحميل المشغّل…</span>
        </div>
      )}

      {!activated && !loading && (
        <button
          type="button"
          onClick={() => setActivated(true)}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3
            bg-zinc-950/95 backdrop-blur-sm transition hover:bg-zinc-950/85"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full
              bg-white text-black shadow-2xl shadow-black/50"
          >
            <Play size={26} className="fill-black" />
          </span>
          <span className="text-sm font-bold text-white">اضغط لبدء المشاهدة</span>
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Shield size={12} />
            {blockPopups ? "حماية من الإعلانات المنبثقة" : "اضغط مرة واحدة قبل التفاعل مع المشغّل"}
          </span>
        </button>
      )}

      {warming && (
        <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <span className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-zinc-300">
            جاري تجهيز المشغّل…
          </span>
        </div>
      )}

      <iframe
        key={reloadKey}
        src={src}
        title={title}
        className={`absolute inset-0 h-full w-full border-0
          ${iframeInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
        allow={IFRAME_ALLOW}
        allowFullScreen
        {...(blockPopups ? { sandbox: IFRAME_SANDBOX } : {})}
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
