"use client";

import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

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

  const TYPE_LABELS: Record<string, string> = {
    SOFTWARE: t.nav.licenses,
    CLOUD: t.cloud.title,
    HARDWARE: t.hw.title,
    DOMAIN_SSL: t.domain.title,
    OTHER: t.hw.other,
  };

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t.asset.statusActive,
    INACTIVE: t.employee.inactive,
    DISPOSED: t.asset.statusDisposed,
  };

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
          <TableSection
            title={t.dashboard.assetsByType}
            headers={[t.common.type, t.dashboard.totalAssets, t.dashboard.monthlyExpenses]}
            rows={data.byType.map((r) => [
              TYPE_LABELS[r.type] ?? r.type,
              `${r.count}${t.dashboard.items}`,
              `₩${r.cost.toLocaleString()}`,
            ])}
            noDataText={t.common.noData}
          />
          <TableSection
            title={`${t.common.status} ${t.common.detail}`}
            headers={[t.common.status, t.dashboard.totalAssets, t.dashboard.monthlyExpenses]}
            rows={data.byStatus.map((r) => [
              STATUS_LABELS[r.status] ?? r.status,
              `${r.count}${t.dashboard.items}`,
              `₩${r.cost.toLocaleString()}`,
            ])}
            noDataText={t.common.noData}
          />
        </div>

        {/* Department */}
        <div className="mb-6">
          <TableSection
            title={t.employee.department}
            headers={[t.employee.department, t.dashboard.totalAssets, t.dashboard.monthlyExpenses]}
            rows={data.byDepartment.map((r) => [
              r.department,
              `${r.count}${t.dashboard.items}`,
              `₩${r.cost.toLocaleString()}`,
            ])}
            noDataText={t.common.noData}
          />
        </div>

        {/* Asset Details Table */}
        <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">{t.asset.assetName} {t.common.detail} {t.common.list}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assetName}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.type}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.common.status}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">{t.dashboard.monthlyExpenses}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.assignee}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t.asset.expiryDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.assetDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      {t.common.noData}
                    </td>
                  </tr>
                ) : (
                  data.assetDetails.map((asset) => (
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
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {asset.monthlyCost != null ? `₩${asset.monthlyCost.toLocaleString()}` : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.assignee?.name ?? asset.department ?? t.license.unassigned}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {asset.expiryDate
                          ? new Date(asset.expiryDate).toLocaleDateString()
                          : "\u2014"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSection({
  title,
  headers,
  rows,
  noDataText,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  noDataText: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`pb-2 text-xs font-medium uppercase text-gray-500 ${i > 0 ? "text-right" : "text-left"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-4 text-center text-sm text-gray-400">
                {noDataText}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`py-2 text-sm ${ci === 0 ? "text-gray-900" : "text-right text-gray-600"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
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
