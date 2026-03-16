"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Locale, TranslationDict } from "./types";
import { ko as defaultDict } from "./ko";

// Lazy-load translations to keep bundle lighter (ko is bundled synchronously as fallback)
const TRANSLATIONS: Record<Locale, () => Promise<TranslationDict>> = {
  ko: () => Promise.resolve(defaultDict),
  en: () => import("./en").then((m) => m.en),
  ja: () => import("./ja").then((m) => m.ja),
  zh: () => import("./zh").then((m) => m.zh),
  vi: () => import("./vi").then((m) => m.vi),
  "zh-TW": () => import("./zh-TW").then((m) => m.zhTW),
};

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
  "zh-TW": "繁體中文",
  ja: "日本語",
  zh: "中文",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
  zh: "ZH",
  vi: "VI",
  "zh-TW": "TW",
};

const STORAGE_KEY = "app-locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationDict;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [dict, setDict] = useState<TranslationDict>(defaultDict);
  const [isLoading, setIsLoading] = useState(false);

  // On mount, read stored locale
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in TRANSLATIONS) {
      setLocaleState(stored);
    }
  }, []);

  // Load translation when locale changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    TRANSLATIONS[locale]().then((loaded) => {
      if (!cancelled) {
        setDict(loaded);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update html lang attribute
    const langMap: Record<string, string> = { zh: "zh-CN", "zh-TW": "zh-TW" };
    document.documentElement.lang = langMap[newLocale] ?? newLocale;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dict, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export type { Locale, TranslationDict };
