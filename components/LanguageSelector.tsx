"use client";

import { useEffect, useRef } from "react";
import { Film, Languages, Check } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { localeConfig, Locale } from "@/lib/i18n";

/* خيارات اللغة — نفس المعطيات للزائر العربي والإنجليزي */
const OPTIONS: { id: Locale; englishName: string; nativeName: string; englishHint: string; nativeHint: string }[] = [
  { id: "ar", englishName: "Arabic",  nativeName: "العربية",  englishHint: "Right-to-left interface",      nativeHint: "واجهة من اليمين إلى اليسار" },
  { id: "en", englishName: "English", nativeName: "English",  englishHint: "Left-to-right interface",      nativeHint: "واجهة من اليسار إلى اليمين" },
];

export function LanguageSelector() {
  const { showSelector, chooseLanguage } = useLanguage();
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* منع تمرير الصفحة خلف النافذة + تركيز الخيار الأول */
  useEffect(() => {
    if (!showSelector) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRefs.current[0]?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [showSelector]);

  if (!showSelector) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-selector-title"
      dir="ltr"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm"
    >
      <div
        className="relative m-4 w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-950
          ring-1 ring-white/10 shadow-2xl shadow-black/60"
      >
        {/* زخرفة ضوئية خفيفة أعلى البطاقة */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32
          bg-gradient-to-b from-violet-500/10 via-transparent to-transparent" />

        <div className="relative flex flex-col items-center gap-3 px-6 pb-2 pt-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black shadow-lg">
            <Film size={22} />
          </span>
          <h2 id="language-selector-title" className="text-xl font-black text-white">
            Welcome to CimaMax
          </h2>
          <p className="text-sm text-zinc-400">Choose your language to continue</p>
          <p dir="rtl" className="text-sm text-zinc-400">اختر لغتك للمتابعة</p>
        </div>

        <div className="relative flex flex-col gap-3 p-6 sm:flex-row">
          {OPTIONS.map((opt, i) => {
            const { direction } = localeConfig[opt.id];
            return (
              <button
                key={opt.id}
                ref={el => { cardRefs.current[i] = el; }}
                onClick={() => chooseLanguage(opt.id)}
                dir={direction}
                className="group relative flex flex-1 cursor-pointer flex-col items-center gap-2
                  overflow-hidden rounded-xl border border-white/10 bg-[#15151a] px-6 py-7
                  ring-1 ring-white/5 transition-all duration-300
                  hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#1c1c22] hover:ring-white/25
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full
                  bg-white/10 text-zinc-300 ring-1 ring-white/10 transition-colors
                  group-hover:bg-white/15 group-hover:text-white">
                  <Languages size={20} />
                </span>
                <span className="text-lg font-black text-white">{opt.nativeName}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  {opt.englishName}
                </span>
                <span dir={direction} className="text-xs text-zinc-400">{opt.nativeHint}</span>
                <span dir={direction === "rtl" ? "ltr" : "rtl"} className="text-[11px] text-zinc-600">
                  {opt.englishHint}
                </span>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5
                  text-[11px] font-extrabold text-zinc-300 ring-1 ring-white/10 transition
                  group-hover:bg-white group-hover:text-black">
                  <Check size={12} className="opacity-0 transition group-hover:opacity-100" />
                  {opt.id === "ar" ? "متابعة" : "Continue"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="relative pb-5 text-center text-[11px] text-zinc-600">
          You can continue in Arabic or English · يمكنك المتابعة بالعربية أو الإنجليزية
        </p>
      </div>
    </div>
  );
}
