"use client";

import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { ExpiringItem, AssetCategory } from "@/lib/dashboard-aggregator";
import type { TranslationDict } from "@/lib/i18n/types";

function getLink(item: ExpiringItem): string {
  if (item.source === "LICENSE") return `/licenses/${item.sourceId}`;
  switch (item.category) {
    case "CLOUD": return `/cloud/${item.sourceId}`;
    case "HARDWARE": return `/hardware/${item.sourceId}`;
    case "DOMAIN_SSL": return `/domains/${item.sourceId}`;
    default: return `/licenses/${item.sourceId}`;
  }
}

function getCategoryLabel(t: TranslationDict, category: AssetCategory): string {
  switch (category) {
    case "SOFTWARE": return t.nav.licenses;
    case "CLOUD": return t.nav.cloud;
    case "HARDWARE": return t.nav.hardware;
    case "DOMAIN_SSL": return t.nav.domainSsl;
    case "CONTRACT": return t.nav.contracts;
    case "OTHER": return t.hw.other;
  }
}

function getBadge(daysLeft: number) {
  if (daysLeft <= 7) return { color: "bg-red-100 text-red-700", label: `D-${daysLeft}` };
  if (daysLeft <= 30) return { color: "bg-orange-100 text-orange-700", label: `D-${daysLeft}` };
  return { color: "bg-yellow-100 text-yellow-700", label: `D-${daysLeft}` };
}

export default function ExpiringWidget({ items }: { items: ExpiringItem[] }) {
  const { t, locale } = useTranslation();

  if (items.length === 0) return null;

  const dateLocale = locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900">{t.dashboard.expiringAssets}</h2>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{items.length}{t.dashboard.items}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const badge = getBadge(item.daysLeft);
          return (
            <Link
              key={`${item.source}-${item.sourceId}`}
              href={getLink(item)}
              className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className={`h-4 w-4 ${item.daysLeft <= 7 ? "text-red-500" : item.daysLeft <= 30 ? "text-orange-500" : "text-yellow-500"}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {getCategoryLabel(t, item.category)} · {new Date(item.expiryDate).toLocaleDateString(dateLocale)}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.color}`}>
                {badge.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
