"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Clock, CheckCircle, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

function ExpiringItemRow({
  item,
  dateLocale,
  t,
}: {
  item: ExpiringItem;
  dateLocale: string;
  t: TranslationDict;
}) {
  const badge = getBadge(item.daysLeft);
  const [notifying, setNotifying] = useState(false);
  const [renewed, setRenewed] = useState(false);

  const handleNotify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.source === "LICENSE") {
      toast.info("라이선스 알림은 라이선스 상세 페이지에서 발송하세요.");
      return;
    }
    setNotifying(true);
    try {
      const res = await fetch(`/api/assets/${item.sourceId}/notify`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.message ?? "알림을 발송했습니다.");
      } else {
        toast.error(data.message ?? data.error ?? "알림 발송에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류로 알림 발송에 실패했습니다.");
    } finally {
      setNotifying(false);
    }
  };

  const handleRenewed = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to detail page for actual renewal form
    // Just show toast and mark locally as "visited"
    setRenewed(true);
    toast.success(`${item.name} 갱신 페이지로 이동합니다.`, {
      action: {
        label: "이동",
        onClick: () => window.location.assign(getLink(item)),
      },
    });
  };

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-4 py-3 transition-colors ${
        renewed ? "border-green-200 bg-green-50" : "border-gray-100 hover:bg-gray-50"
      }`}
    >
      {/* Left — link area */}
      <Link href={getLink(item)} className="flex min-w-0 flex-1 items-center gap-3">
        {renewed ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
        ) : (
          <Clock
            className={`h-4 w-4 shrink-0 ${
              item.daysLeft <= 7 ? "text-red-500" : item.daysLeft <= 30 ? "text-orange-500" : "text-yellow-500"
            }`}
          />
        )}
        <div className="min-w-0">
          <p className={`truncate text-sm font-medium ${renewed ? "text-green-700 line-through" : "text-gray-900"}`}>
            {item.name}
          </p>
          <p className="truncate text-xs text-gray-500">
            {getCategoryLabel(t, item.category)} · {new Date(item.expiryDate).toLocaleDateString(dateLocale)}
          </p>
        </div>
      </Link>

      {/* Right — badge + actions */}
      <div className="ml-3 flex shrink-0 items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.color}`}>{badge.label}</span>

        {/* 알림 발송 */}
        <button
          onClick={handleNotify}
          disabled={notifying}
          title="알림 발송"
          className="rounded p-1.5 text-gray-400 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
        >
          {notifying ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
        </button>

        {/* 갱신 완료 표시 */}
        <button
          onClick={handleRenewed}
          disabled={renewed}
          title={renewed ? "갱신 처리됨" : "갱신 완료로 표시"}
          className={`rounded p-1.5 disabled:opacity-50 ${
            renewed
              ? "text-green-600"
              : "text-gray-400 hover:bg-green-50 hover:text-green-600"
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
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
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          {items.length}{t.dashboard.items}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          <Bell className="mr-1 inline h-3 w-3" />알림발송 &nbsp;
          <CheckCircle className="mr-1 inline h-3 w-3" />갱신완료
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ExpiringItemRow
            key={`${item.source}-${item.sourceId}`}
            item={item}
            dateLocale={dateLocale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
