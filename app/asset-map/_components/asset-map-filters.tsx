"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Cloud,
  HardDrive,
  Globe,
  User,
  Building2,
  Search,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface FilterState {
  types: string[];
  orgUnitId?: number;
  search: string;
}

interface OrgUnit {
  id: number;
  name: string;
}

interface AssetMapFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const TYPE_OPTIONS = [
  { key: "LICENSE", icon: FileText, color: "text-blue-500 bg-blue-50 border-blue-300" },
  { key: "CLOUD", icon: Cloud, color: "text-purple-500 bg-purple-50 border-purple-300" },
  { key: "HARDWARE", icon: HardDrive, color: "text-orange-500 bg-orange-50 border-orange-300" },
  { key: "DOMAIN_SSL", icon: Globe, color: "text-green-500 bg-green-50 border-green-300" },
  { key: "EMPLOYEE", icon: User, color: "text-gray-500 bg-gray-50 border-gray-300" },
  { key: "ORG_UNIT", icon: Building2, color: "text-sky-500 bg-sky-50 border-sky-300" },
];

const TYPE_LABELS: Record<string, Record<string, string>> = {
  LICENSE: { ko: "라이선스", en: "License" },
  CLOUD: { ko: "클라우드", en: "Cloud" },
  HARDWARE: { ko: "하드웨어", en: "Hardware" },
  DOMAIN_SSL: { ko: "도메인", en: "Domain" },
  EMPLOYEE: { ko: "조직원", en: "Employee" },
  ORG_UNIT: { ko: "부서", en: "Department" },
};

export default function AssetMapFilters({ filters, onFilterChange }: AssetMapFiltersProps) {
  const { t, locale } = useTranslation();
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    fetch("/api/org/units")
      .then((r) => r.json())
      .then((data) => {
        const units = Array.isArray(data) ? data : data.data ?? [];
        setOrgUnits(units.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })));
      })
      .catch(() => {});
  }, []);

  const toggleType = useCallback(
    (type: string) => {
      const newTypes = filters.types.includes(type)
        ? filters.types.filter((t) => t !== type)
        : [...filters.types, type];
      onFilterChange({ ...filters, types: newTypes });
    },
    [filters, onFilterChange]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFilterChange({ ...filters, search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFilterChange]);

  const lang = locale === "ko" ? "ko" : "en";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {/* Type toggles */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = filters.types.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggleType(opt.key)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                active
                  ? opt.color
                  : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {TYPE_LABELS[opt.key]?.[lang] ?? opt.key}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-gray-200" />

      {/* OrgUnit filter */}
      <select
        value={filters.orgUnitId ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            orgUnitId: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-600"
      >
        <option value="">{t.common.all} {lang === "ko" ? "부서" : "Departments"}</option>
        {orgUnits.map((ou) => (
          <option key={ou.id} value={ou.id}>
            {ou.name}
          </option>
        ))}
      </select>

      {/* Search */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t.common.search + "..."}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-md border border-gray-200 py-1.5 pl-7 pr-3 text-xs text-gray-600 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 w-48"
        />
      </div>
    </div>
  );
}
