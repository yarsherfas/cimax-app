"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { fetchArabicStreamClient, type ArabicStreamResult } from "@/lib/arabicClient";

type Quality = "1080p" | "720p" | "480p";
const QUALITIES: Quality[] = ["1080p", "720p", "480p"];

export function ArabicPlayer({
  arabicId,
  episode,
  animeType = "SERIES",
  title,
  onEnded,
  onQualityChange,
}: {
  arabicId: string;
  episode: number | string;
  animeType?: string;
  title: string;
  onEnded?: () => void;
  onQualityChange?: (q: string) => void;
}) {
  const { locale, t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState<Quality>("1080p");
  const [stream, setStream] = useState<ArabicStreamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<{ quality: string; serverKey: string }[]>([]);

  const fetchStream = useCallback(async (q: Quality) => {
    if (!arabicId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchArabicStreamClient(String(arabicId), episode, q, animeType);
      if (!res?.url) {
        setError(locale === "en" ? "No Arabic stream for this episode" : "لا يوجد رابط عربي لهذه الحلقة");
        setStream(null);
        setAvailable([]);
      } else {
        setStream(res);
        setAvailable(res.available || []);
        if (res.quality !== q) setQuality(res.quality as Quality);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      setStream(null);
    } finally {
      setLoading(false);
    }
  }, [arabicId, episode, animeType, locale]);

  useEffect(() => {
    fetchStream(quality);
  }, [fetchStream, quality, episode]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream?.url) return;
    // reload video when url changes
    v.load();
  }, [stream?.url]);

  const handleQuality = (q: Quality) => {
    setQuality(q);
    onQualityChange?.(q);
  };

  const isRTL = locale === "ar";

  if (loading) {
    return (
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-violet-400" size={28} />
          <span className="text-xs text-zinc-500">
            {locale === "en" ? "Fetching Arabic stream…" : "جاري جلب الرابط العربي…"}
          </span>
          <span className="text-[11px] text-zinc-600">
            {locale === "en" ? `Episode ${episode} · ${quality}` : `الحلقة ${episode} · ${quality}`}
          </span>
        </div>
      </div>
    );
  }

  if (error || !stream?.url) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950 p-6 text-center ring-1 ring-white/10">
        <p className="text-sm font-bold text-zinc-300">{error || (locale === "en" ? "Stream unavailable" : "الرابط غير متاح")}</p>
        <p className="text-xs text-zinc-500">
          {locale === "en"
            ? "Try another quality or switch to the fallback player."
            : "جرّب جودة أخرى أو استخدم المشغّل البديل."}
        </p>
        <div className="mt-2 flex gap-2">
          {QUALITIES.map((q) => (
            <button
              key={q}
              onClick={() => handleQuality(q)}
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${quality === q ? "bg-white text-black ring-white" : "bg-zinc-900 text-zinc-300 ring-white/10 hover:ring-white/30"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10 aspect-video">
        <video
          ref={videoRef}
          key={stream.url}
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
          onEnded={onEnded}
          className="h-full w-full"
          poster=""
        >
          <source src={stream.url} type="video/mp4" />
          {locale === "en" ? "Your browser does not support video." : "متصفحك لا يدعم تشغيل الفيديو."}
        </video>
        {/* Title overlay (non-blocking) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
          <p className="truncate text-xs font-bold text-white/90" dir={isRTL ? "rtl" : "ltr"}>
            {title} · {locale === "en" ? `E${episode}` : `ح${episode}`} · {stream.quality}
          </p>
        </div>
      </div>

      {/* Quality switcher + source info */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-zinc-500">
            {locale === "en" ? "Quality:" : "الجودة:"}
          </span>
          <div className="flex gap-1">
            {QUALITIES.map((q) => {
              const avail = available.length === 0 || available.some((a) => a.quality === q);
              return (
                <button
                  key={q}
                  disabled={!avail}
                  onClick={() => handleQuality(q)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ring-1 ${quality === q ? "bg-white text-black ring-white" : avail ? "bg-zinc-800 text-zinc-300 ring-white/10 hover:ring-white/30" : "bg-zinc-900 text-zinc-600 ring-white/5 cursor-not-allowed"}`}
                >
                  {q}
                </button>
              );
            })}
          </div>
          <span className="ms-2 hidden text-[10px] text-zinc-600 md:inline">
            {locale === "en" ? "Arabic hard-sub" : "مترجم عربي (حرق)"}
          </span>
        </div>
        <a
          href={stream.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-zinc-500 hover:text-violet-400"
        >
          {locale === "en" ? "Open direct link" : "فتح الرابط المباشر"}
        </a>
      </div>
    </div>
  );
}
