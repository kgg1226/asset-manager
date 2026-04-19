"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText, Search, SlidersHorizontal, Download, X, Save, BookMarked } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const PRESET_STORAGE_KEY = "report_export_presets";
const ALL_FIELDS = ["name", "type", "status", "vendor", "monthlyCost", "assignee", "expiryDate"] as const;
type ExportField = typeof ALL_FIELDS[number];

interface ExportPreset { name: string; fields: ExportField[] }

function CustomExportModal({
  open,
  onClose,
  data,
  yearMonth,
  typeLabels,
  statusLabels,
}: {
  open: boolean;
  onClose: () => void;
  data: ReportData;
  yearMonth: string;
  typeLabels: Record<string, string>;
  statusLabels: Record<string, string>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ExportField[]>([...ALL_FIELDS]);
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  const FIELD_LABELS: Record<ExportField, string> = {
    name: t.asset.assetName,
    type: t.common.type,
    status: t.common.status,
    vendor: t.license.vendor,
    monthlyCost: t.dashboard.monthlyExpenses,
    assignee: t.asset.assignee,
    expiryDate: t.asset.expiryDate,
  };

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [open]);

  if (!open) return null;

  const toggle = (f: ExportField) =>
    setSelected((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const savePreset = () => {
    if (!presetName.trim() || selected.length === 0) return;
    const next = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), fields: selected }];
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
    setPresetName("");
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  };

  const exportCsv = () => {
    const header = selected.map((f) => FIELD_LABELS[f]).join(",");
    const rows = data.assetDetails.map((a) => {
      return selected.map((f) => {
        let val = "";
        if (f === "name") val = a.name;
        else if (f === "type") val = typeLabels[a.type] ?? a.type;
        else if (f === "status") val = statusLabels[a.status] ?? a.status;
        else if (f === "vendor") val = a.vendor ?? "";
        else if (f === "monthlyCost") val = a.monthlyCost != null ? String(a.monthlyCost) : "";
        else if (f === "assignee") val = a.assignee?.name ?? a.department ?? "";
        else if (f === "expiryDate") val = a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : "";
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
    });
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${yearMonth}_custom.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="relative mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Download className="h-5 w-5 text-blue-500" />
            {t.report.customExport}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Presets */}
        {presets.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-gray-500">{t.report.savedPresets}</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <span key={p.name} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <button type="button" onClick={() => setSelected(p.fields)} className="hover:underline">{p.name}</button>
                  <button type="button" onClick={() => deletePreset(p.name)} className="ml-0.5 text-blue-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Field checkboxes */}
        <p className="mb-2 text-xs font-medium text-gray-500">{t.report.selectFields}</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {ALL_FIELDS.map((f) => (
            <label key={f} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${selected.includes(f) ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <input type="checkbox" checked={selected.includes(f)} onChange={() => toggle(f)} className="sr-only" />
              <span className={`h-4 w-4 rounded border flex items-center justify-center ${selected.includes(f) ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                {selected.includes(f) && <span className="text-white text-xs">✓</span>}
              </span>
              {FIELD_LABELS[f]}
            </label>
          ))}
        </div>

        {/* Save preset */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && savePreset()}
            placeholder={t.report.presetNamePlaceholder}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={savePreset}
            disabled={!presetName.trim() || selected.length === 0}
            className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            {t.common.save}
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            {t.common.cancel}
          </button>
          <button
            onClick={exportCsv}
            disabled={selected.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            CSV {t.common.export}
          </button>
        </div>
      </div>
    </div>
  );
}

type ReportData = {
  period: string;
  startDate: string;
  endDate: string;
  summary: { totalMonthlyCost: number; assetCount: number };
  byType: { type: string; count: number; cost: number }[];
  byStatus: { status: string; count: number; cost: number }[];
  byDepartment: { department: string; count: number; cost: number }[];
  expiringCount: number;
  assetDetails: {
    id: string;
    name: string;
    type: string;
    status: string;
    vendor: string | null;
    monthlyCost: number | null;
    expiryDate: string | null;
    assignee: { id: string; name: string } | null;
    department: string | null;
  }[];
};

export default function ReportDetailClient({
  yearMonth,
  data,
}: {
  yearMonth: string;
  data: ReportData | null;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCustomExport, setShowCustomExport] = useState(false);

  const TYPE_LABELS: Record<string, string> = {
    SOFTWARE: t.nav.licenses,
    CLOUD: t.cloud.title,
    HARDWARE: t.hw.title,
    DOMAIN_SSL: t.domain.title,
    CONTRACT: t.contract.title,
    OTHER: t.hw.other,
  };

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t.asset.statusActive,
    INACTIVE: t.employee.inactive,
    DISPOSED: t.asset.statusDisposed,
  };

  const filteredAssets = data?.assetDetails.filter((a) => {
    const q = search.toLowerCase();
    if (typeFilter && a.type !== typeFilter) return false;
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.vendor ?? "").toLowerCase().includes(q) ||
      (a.assignee?.name ?? "").toLowerCase().includes(q) ||
      (a.department ?? "").toLowerCase().includes(q)
    );
  }) ?? [];

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <Link href="/reports" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> {t.report.title} {t.common.list}
          </Link>
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">{yearMonth} {t.report.monthlyReport} {t.common.noData}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{yearMonth} {t.report.monthlyReport}</h1>
            <span className="text-sm text-gray-400">{data.startDate} ~ {data.endDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomExport(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <BookMarked className="h-4 w-4" />
              {t.report.customExport}
            </button>
            <a
              href={`/api/reports/monthly/${yearMonth}/excel`}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </a>
            <a
              href={`/api/reports/monthly/${yearMonth}/pdf`}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <FileText className="h-4 w-4" />
              PDF
            </a>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
            <p className="text-xs font-medium uppercase text-gray-500">{t.dashboard.monthlyExpenses}</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              ₩{data.summary.totalMonthlyCost.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <p className="text-xs font-medium uppercase text-gray-500">{t.dashboard.totalAssets}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{data.summary.assetCount}{t.dashboard.items}</p>
          </div>
          <div className={`rounded-lg p-4 ring-1 ${data.expiringCount > 0 ? "bg-yellow-50 ring-yellow-200" : "bg-white ring-gray-200"}`}>
            <p className="text-xs font-medium uppercase text-gray-500">{t.dashboard.expiringAssets}</p>
            <p className={`mt-1 text-2xl font-bold ${data.expiringCount > 0 ? "text-yellow-700" : "text-gray-900"}`}>
              {data.expiringCount}{t.dashboard.items}
            </p>
          </div>
        </div>

        {/* Charts: Type & Status */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BarTableSection
            title={t.dashboard.assetsByType}
            rows={data.byType.map((r) => ({ label: TYPE_LABELS[r.type] ?? r.type, count: r.count, cost: r.cost, key: r.type }))}
            onFilterClick={(key) => setTypeFilter(typeFilter === key ? "" : key)}
            activeFilter={typeFilter}
            noDataText={t.common.noData}
          />
          <BarTableSection
            title={`${t.common.status} ${t.common.detail}`}
            rows={data.byStatus.map((r) => ({ label: STATUS_LABELS[r.status] ?? r.status, count: r.count, cost: r.cost, key: r.status }))}
            noDataText={t.common.noData}
          />
        </div>

        {/* Department */}
        <div className="mb-6">
          <BarTableSection
            title={t.employee.department}
            rows={data.byDepartment.map((r) => ({ label: r.department, count: r.count, cost: r.cost, key: r.department }))}
            noDataText={t.common.noData}
          />
        </div>

        {/* Asset Details Table */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 mr-auto">
              {t.asset.assetName} {t.common.detail} {t.common.list}
              <span className="ml-2 text-sm font-normal text-gray-400">({filteredAssets.length}{t.dashboard.items})</span>
            </h2>
            {typeFilter && (
              <button onClick={() => setTypeFilter("")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" />{TYPE_LABELS[typeFilter] ?? typeFilter} ×
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.common.search}
                className="rounded-md border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-52"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assetName}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.status}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.license.vendor}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">{t.dashboard.monthlyExpenses}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assignee}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.expiryDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      {t.common.noData}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline">
                          {asset.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {TYPE_LABELS[asset.type] ?? asset.type}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={asset.status} statusLabels={STATUS_LABELS} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{asset.vendor ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {asset.monthlyCost != null ? `₩${asset.monthlyCost.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.assignee?.name ?? asset.department ?? t.license.unassigned}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCustomExport && (
        <CustomExportModal
          open={showCustomExport}
          onClose={() => setShowCustomExport(false)}
          data={data}
          yearMonth={yearMonth}
          typeLabels={TYPE_LABELS}
          statusLabels={STATUS_LABELS}
        />
      )}
    </div>
  );
}

function BarTableSection({
  title,
  rows,
  noDataText,
  onFilterClick,
  activeFilter,
}: {
  title: string;
  rows: { label: string; count: number; cost: number; key: string }[];
  noDataText: string;
  onFilterClick?: (key: string) => void;
  activeFilter?: string;
}) {
  const maxCost = Math.max(...rows.map((r) => r.cost), 1);
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">{noDataText}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.key}
              className={`cursor-default ${onFilterClick ? "cursor-pointer" : ""} ${activeFilter === r.key ? "opacity-100" : activeFilter ? "opacity-50" : "opacity-100"}`}
              onClick={() => onFilterClick?.(r.key)}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-gray-900">{r.label}</span>
                <span className="text-gray-500">{r.count}건 · ₩{r.cost.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-400 transition-all"
                  style={{ width: `${(r.cost / maxCost) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, statusLabels }: { status: string; statusLabels: Record<string, string> }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    DISPOSED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}
