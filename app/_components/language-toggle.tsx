"use client";

import { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["ko", "en", "ja", "zh", "vi", "zh-TW"];

export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        title="Language"
      >
        <Languages className="h-4 w-4" />
        <span className="text-xs font-bold">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-50">
          {LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
                locale === loc
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="w-6 text-xs font-bold text-gray-400">{LOCALE_FLAGS[loc]}</span>
              {LOCALE_LABELS[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
