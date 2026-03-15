"use client";

import { useTranslation } from "@/lib/i18n";
import type { AssetCategory } from "@/lib/dashboard-aggregator";
import { LayoutDashboard, Monitor, Cloud, HardDrive, Globe, FileText, MoreHorizontal } from "lucide-react";
import type { TranslationDict } from "@/lib/i18n/types";

function getCategoryLabel(t: TranslationDict, key: AssetCategory): string {
  switch (key) {
    case "SOFTWARE": return t.nav.licenses;
    case "CLOUD": return t.nav.cloud;
    case "HARDWARE": return t.nav.hardware;
    case "DOMAIN_SSL": return t.nav.domainSsl;
    case "CONTRACT": return t.nav.contracts;
    case "OTHER": return t.hw.other;
  }
}

const TAB_KEYS: { key: AssetCategory | null; icon: React.ReactNode }[] = [
  { key: null, icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "SOFTWARE", icon: <Monitor className="h-4 w-4" /> },
  { key: "CLOUD", icon: <Cloud className="h-4 w-4" /> },
  { key: "HARDWARE", icon: <HardDrive className="h-4 w-4" /> },
  { key: "DOMAIN_SSL", icon: <Globe className="h-4 w-4" /> },
  { key: "CONTRACT", icon: <FileText className="h-4 w-4" /> },
  { key: "OTHER", icon: <MoreHorizontal className="h-4 w-4" /> },
];

export default function CategoryTabs({
  selected,
  onChange,
}: {
  selected: AssetCategory | null;
  onChange: (type: AssetCategory | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {TAB_KEYS.map((tab) => {
        const active = selected === tab.key;
        const label = tab.key === null ? t.common.all : getCategoryLabel(t, tab.key);
        return (
          <button
            key={tab.key ?? "all"}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
