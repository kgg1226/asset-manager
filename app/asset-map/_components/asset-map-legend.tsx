"use client";

import {
  FileText,
  Cloud,
  HardDrive,
  Globe,
  User,
  Building2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const LEGEND_ITEMS = [
  { type: "LICENSE", icon: FileText, color: "text-blue-500", bg: "bg-blue-100" },
  { type: "CLOUD", icon: Cloud, color: "text-purple-500", bg: "bg-purple-100" },
  { type: "HARDWARE", icon: HardDrive, color: "text-orange-500", bg: "bg-orange-100" },
  { type: "DOMAIN_SSL", icon: Globe, color: "text-green-500", bg: "bg-green-100" },
  { type: "EMPLOYEE", icon: User, color: "text-gray-500", bg: "bg-gray-100" },
  { type: "ORG_UNIT", icon: Building2, color: "text-sky-500", bg: "bg-sky-100" },
];

const EDGE_LEGEND = [
  { type: "ASSIGNMENT", label: { ko: "할당됨", en: "Assigned" }, color: "bg-blue-400" },
  { type: "ASSIGNED_TO", label: { ko: "배정됨", en: "Allocated" }, color: "bg-orange-400" },
  { type: "INSTALLED", label: { ko: "설치됨", en: "Installed" }, color: "bg-purple-400" },
  { type: "BELONGS_TO", label: { ko: "소속", en: "Belongs to" }, color: "bg-sky-400" },
  { type: "CHILD_OF", label: { ko: "하위", en: "Child of" }, color: "bg-gray-400" },
];

const TYPE_LABELS: Record<string, Record<string, string>> = {
  LICENSE: { ko: "라이선스", en: "License" },
  CLOUD: { ko: "클라우드", en: "Cloud" },
  HARDWARE: { ko: "하드웨어", en: "Hardware" },
  DOMAIN_SSL: { ko: "도메인/SSL", en: "Domain/SSL" },
  EMPLOYEE: { ko: "조직원", en: "Employee" },
  ORG_UNIT: { ko: "부서", en: "Department" },
};

export default function AssetMapLegend() {
  const { locale } = useTranslation();
  const lang = locale === "ko" ? "ko" : "en";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm w-44">
      <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
        {lang === "ko" ? "범례" : "Legend"}
      </h3>

      {/* Node types */}
      <div className="space-y-1.5 mb-3">
        {LEGEND_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.type} className="flex items-center gap-2">
              <div className={`rounded p-0.5 ${item.bg}`}>
                <Icon className={`h-3 w-3 ${item.color}`} />
              </div>
              <span className="text-[11px] text-gray-600">
                {TYPE_LABELS[item.type]?.[lang]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Edge types */}
      <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
        {lang === "ko" ? "관계" : "Relations"}
      </h3>
      <div className="space-y-1.5">
        {EDGE_LEGEND.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <div className={`h-0.5 w-4 rounded ${item.color}`} />
            <span className="text-[11px] text-gray-600">{item.label[lang]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
