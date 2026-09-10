"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import {
  getMessages, localeConfig, LANGUAGE_STORAGE_KEY, Locale, Messages,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  t: Messages;
  showSelector: boolean;
  chooseLanguage: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const DEFAULT_LOCALE: Locale = "ar";

function isLocale(value: string | null): value is Locale {
  return value === "ar" || value === "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  /* يبدأ دائماً بالعربية (تطابق SSR) ثم يُصحَّح من localStorage بعد الترطيب */
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {}
    if (isLocale(stored)) {
      setLocale(stored);
    } else {
      setShowSelector(true);
    }
    setReady(true);
  }, []);

  const chooseLanguage = useCallback((next: Locale) => {
    setLocale(next);
    setShowSelector(false);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {}
  }, []);

  /* تحديث لغة الوثيقة واتجاهها مع كل تغيير */
  useEffect(() => {
    if (!ready) return;
    const { direction } = localeConfig[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.title = getMessages(locale).metaTitle;
  }, [locale, ready]);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, t: getMessages(locale), showSelector, chooseLanguage }),
    [locale, showSelector, chooseLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
